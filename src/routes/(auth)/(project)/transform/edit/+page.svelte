<script lang="ts">
	import type { PageData } from './$types'
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafConditionBuilder from '$lib/components/WafConditionBuilder.svelte'
	import TransformOpsEditor from '$lib/components/TransformOpsEditor.svelte'
	import { parseExpression } from '$lib/waf/expression'
	import {
		newRule,
		normalizeRules,
		toApiRules,
		coerceOpsToPhase,
		validateRule,
		phaseLabels
	} from '$lib/transform/rules'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	const phaseOptions = [
		{ value: 'request', label: 'Request — mutate the inbound request before the upstream' },
		{ value: 'response', label: 'Response — mutate the response headers/status on the way out' }
	]

	const modeOptions = [
		{ value: 'enforce', label: 'Enforce — apply the operations to matching requests' },
		{ value: 'shadow', label: 'Shadow — only count matches, apply nothing' }
	]

	// The whole loaded zone's rules (ordered) are held in memory so Save can
	// rewrite the entire zone with the edited rule in place — transform.set
	// replaces the zone, so the rest must be echoed back untouched.
	const rules = untrack(() => normalizeRules(data.zone?.transforms))
	const description = untrack(() => data.zone?.description ?? '')
	// Index of the rule being edited, or -1 when adding a brand-new one.
	const editIndex = untrack(() => (data.ruleId ? rules.findIndex((r) => r.id === data.ruleId) : -1))
	const isCreate = editIndex === -1

	// Working-copy draft — Cancel discards it without touching the server.
	const draft = $state(untrack(() => {
		if (isCreate) {
			return newRule(rules.map((r) => r.id))
		}
		// Deep-clone so editing the draft's ops (and their array/row fields) never
		// aliases the seed held in `rules`.
		const seed = rules[editIndex]
		return { ...seed, ops: seed.ops.map((o) => structuredClone(o)) }
	}))

	let saving = $state(false)

	// Filter editing mode — Visual (condition builder) or Expression (raw CEL
	// textarea), same pattern as the WAF/cache editors. The filter is optional:
	// empty means the rule applies to every request.
	const canUseVisual = $derived(parseExpression(draft.filter) !== null)
	let filterMode = $state<'visual' | 'raw'>(
		untrack(() => (parseExpression(draft.filter) !== null ? 'visual' : 'raw'))
	)

	// If we're in Visual but the filter becomes non-representable, fall back to
	// raw so the disabled Visual tab can't show stale rows.
	$effect(() => {
		if (filterMode === 'visual' && !canUseVisual) filterMode = 'raw'
	})

	let filterBuilder = $state<{ clearExpression:() => void } | undefined>()

	function clearFilter () {
		if (filterMode === 'visual' && filterBuilder) filterBuilder.clearExpression()
		else draft.filter = ''
	}

	// When the phase changes, fold any op whose type is no longer legal in the
	// new phase to a legal one (header ops survive; phase-specific ops collapse
	// to set-header) — keeps the op editor consistent with the chosen phase.
	function onPhaseChange () {
		coerceOpsToPhase(draft.ops, draft.phase)
	}

	const validationError = $derived(validateRule(draft))
	const canSave = $derived(validationError === null)

	function backToManage () {
		return goto(`/transform/manage?project=${project}&location=${encodeURIComponent(location)}`)
	}

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving || !canSave) return

		saving = true
		try {
			// Rebuild the zone's rule list with the edited rule replaced by id (or
			// appended for create), then write the whole zone.
			let nextRules: typeof rules
			if (isCreate) {
				nextRules = [...rules, draft]
			} else {
				nextRules = rules.map((r) => (r.id === draft.id ? draft : r))
			}

			const resp = await api.invoke('transform.set', {
				project,
				location,
				description,
				transforms: toApiRules(nextRules)
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await backToManage()
		} finally {
			saving = false
		}
	}

	function cancel () {
		backToManage()
	}

	// Enter inside a text field must not implicitly submit the rule. Saving is
	// deliberate, via the Save button (a <button>, where Enter still works) and
	// the raw-CEL <textarea>.
	function blockEnterSubmit (node: HTMLFormElement) {
		function onKeydown (e: KeyboardEvent) {
			if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault()
		}
		node.addEventListener('keydown', onKeydown)
		return { destroy: () => node.removeEventListener('keydown', onKeydown) }
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/transform?project=${project}`} class="link"><h6>Transform</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/transform/manage?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6 class="font-mono">{location}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{isCreate ? 'Add rule' : 'Edit rule'}</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>{isCreate ? 'Add rule' : 'Edit rule'}</strong></h3>
		</div>
		<p class="page-sub">Transform rule in <span class="font-mono">{location}</span></p>
	</div>

	<hr>

	<form class="grid gap-6 w-full" onsubmit={save} use:blockEnterSubmit>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="rule-description">Description</label>
				<div class="input">
					<input id="rule-description" bind:value={draft.description} placeholder="Optional description">
				</div>
			</div>
			<div class="field">
				<label for="rule-phase">Phase</label>
				<Select id="rule-phase" bind:value={draft.phase} options={phaseOptions} onchange={onPhaseChange} />
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h6><strong>Apply to matching requests</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Optional — leave empty to apply this rule to every request.
						The condition is evaluated over <code class="font-mono">request.*</code> at request time.
					</p>
				</div>
				<div class="flex flex-col items-end gap-1">
					<div class="flex items-center gap-2">
						<div class="tabs is-variant-underline" role="tablist">
							<button type="button" class="tab-button" class:is-active={filterMode === 'visual'}
								role="tab" aria-selected={filterMode === 'visual'}
								disabled={!canUseVisual}
								title={canUseVisual ? undefined : 'This expression can’t be shown in the visual editor'}
								onclick={() => { if (canUseVisual) filterMode = 'visual' }}>
								<i class="fa-solid fa-sliders mr-2"></i>
								<span>Visual</span>
							</button>
							<button type="button" class="tab-button" class:is-active={filterMode === 'raw'}
								role="tab" aria-selected={filterMode === 'raw'}
								onclick={() => (filterMode = 'raw')}>
								<i class="fa-solid fa-code mr-2"></i>
								<span>Expression</span>
							</button>
						</div>
						<button type="button" class="button is-variant-tertiary is-size-small"
							disabled={!draft.filter}
							onclick={clearFilter}>
							<i class="fa-solid fa-eraser mr-2"></i>
							<span>Clear</span>
						</button>
					</div>
					{#if !canUseVisual}
						<p class="text-content/50 text-xs text-right max-w-xs">
							This expression can’t be shown in the visual editor — edit it as raw CEL.
						</p>
					{/if}
				</div>
			</div>

			{#if filterMode === 'visual'}
				<WafConditionBuilder bind:this={filterBuilder} bind:expression={draft.filter} />
			{:else}
				<p class="text-content/60 text-sm">
					Match on
					<code class="font-mono">request.method</code>,
					<code class="font-mono">.path</code>,
					<code class="font-mono">.host</code>,
					<code class="font-mono">.query</code>,
					<code class="font-mono">.uri</code>,
					<code class="font-mono">.scheme</code>,
					<code class="font-mono">.headers[…]</code>,
					<code class="font-mono">.country</code>,
					<code class="font-mono">.remote_ip</code>.
					Response rules still evaluate their condition over the request.
				</p>
				<div class="field">
					<label for="rule-filter-raw">Filter (CEL)</label>
					<div class="textarea">
						<textarea id="rule-filter-raw" class="font-mono" rows="5" bind:value={draft.filter}
							placeholder="e.g. request.host == &quot;acme.com&quot;"></textarea>
					</div>
				</div>
			{/if}
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Operations</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Operations run in order for the
					<strong>{phaseLabels[draft.phase].toLowerCase()}</strong> phase.
					A <strong>Redirect</strong> or <strong>CORS</strong> operation must be the
					only operation in its rule.
				</p>
			</div>

			<TransformOpsEditor bind:ops={draft.ops} phase={draft.phase} />
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Mode</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Shadow mode counts matches without mutating traffic — stage a rule's
					condition before enforcing it. Filters compile at the controller; a set
					that fails to compile is rejected wholesale and the last-good set stays live.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="rule-mode">Mode</label>
					<Select id="rule-mode" bind:value={draft.mode} options={modeOptions} />
				</div>
			</div>
		</div>

		<hr>

		<div class="flex items-center gap-3">
			<GuardedButton permission="transform.set" type="submit" loading={saving} disabled={saving || !canSave}
				title={canSave ? undefined : validationError ?? undefined}>Save</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			{#if validationError}
				<p class="text-content/50 text-sm">{validationError}</p>
			{/if}
		</div>
	</form>
</div>
