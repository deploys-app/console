<script lang="ts">
	import type { PageData } from './$types'
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafConditionBuilder from '$lib/components/WafConditionBuilder.svelte'
	import WafTestPanel from '$lib/components/WafTestPanel.svelte'
	import { parseExpression } from '$lib/waf/expression'
	import {
		DEFAULT_STATUS,
		DEFAULT_MESSAGE,
		ruleForm,
		genId,
		normalizeRules,
		toApiRules
	} from '$lib/waf/rules'
	import { normalizeLimits, toApiLimits } from '$lib/waf/limits'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	const actionOptions = [
		{ value: 'log', label: 'Log' },
		{ value: 'allow', label: 'Allow' },
		{ value: 'block', label: 'Block' }
	]

	// The whole loaded zone's rules (ordered) are held in memory so Save can
	// rewrite the entire zone with the edited rule in place.
	const rules = untrack(() => normalizeRules(data.zone?.rules))
	// waf.set replaces the whole zone, so the zone's limits must be echoed back
	// untouched — otherwise saving a rule would wipe them.
	const limits = untrack(() => normalizeLimits(data.zone?.limits))
	const description = untrack(() => data.zone?.description ?? '')
	// Index of the rule being edited, or -1 when adding a brand-new rule.
	const editIndex = untrack(() => (data.ruleId ? rules.findIndex((r) => r.id === data.ruleId) : -1))
	const isCreate = editIndex === -1

	// Working-copy draft — Cancel discards it without touching the server.
	const draft = $state(untrack(() => {
		if (isCreate) {
			const taken = rules.map((r) => r.id)
			return { ...ruleForm(), id: genId(taken) }
		}
		return { ...rules[editIndex] }
	}))

	let saving = $state(false)

	// A rule must actually match something before it can be saved. The expression
	// is only non-empty once at least one complete condition exists (the visual
	// builder drops incomplete rows), so this gates Save on a configured rule.
	const hasCondition = $derived(!!draft.expression.trim())

	// The Visual builder can only represent a flat list of conditions joined by a
	// single AND/OR. Anything else (mixed &&/||, grouping, unknown functions,
	// `.startsWith`/etc, partial input) is "complex" and must be edited as raw.
	const canUseVisual = $derived(parseExpression(draft.expression) !== null)

	// Expression editing mode — Visual (condition builder) or Expression (raw
	// CEL textarea). Both edit the same `draft.expression` string, so switching
	// preserves whatever is there. Start in Visual only when the seed expression
	// is representable; otherwise open straight into raw/Expression mode.
	let mode = $state<'visual' | 'raw'>(
		untrack(() => (parseExpression(draft.expression) !== null ? 'visual' : 'raw'))
	)

	// If we're in Visual but the expression becomes non-representable, fall back
	// to raw so the disabled Visual tab can't show stale rows. (Visual edits stay
	// representable, so this only fires for raw edits made while still on Visual.)
	$effect(() => {
		if (mode === 'visual' && !canUseVisual) mode = 'raw'
	})

	let builder = $state<{ clearExpression:() => void }>()

	function clearExpression () {
		if (mode === 'visual' && builder) builder.clearExpression()
		else draft.expression = ''
	}

	function backToManage () {
		return goto(`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`)
	}

	async function save (e: Event) {
		e.preventDefault()
		if (saving || !hasCondition) return

		saving = true
		try {
			// Rebuild the zone's rule list with the edited rule replaced by id (or
			// appended for create), then write the whole zone.
			let nextRules
			if (isCreate) {
				nextRules = [...rules, { ...draft }]
			} else {
				nextRules = rules.map((r) => (r.id === draft.id ? { ...draft } : r))
			}

			const resp = await api.invoke('waf.set', {
				project,
				location,
				description,
				rules: toApiRules(nextRules),
				limits: toApiLimits(limits)
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

	// Enter inside a text field (the method value combobox, the plain value input,
	// description/status/message) must not implicitly submit the rule — in the
	// value widgets it means "pick/add this value", elsewhere nothing. Saving is
	// deliberate, via the Save button. Enter still works on the button itself
	// (a <button>, not an <input>) and in the raw-CEL <textarea>.
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
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6 class="font-mono">{location}</h6></a>
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
		<p class="page-sub">Rule in <span class="font-mono">{location}</span></p>
	</div>

	<hr>

	<form class="grid gap-6 w-full" onsubmit={save} use:blockEnterSubmit>
		<div class="field">
			<label for="rule-description">Description</label>
			<div class="input">
				<input id="rule-description" bind:value={draft.description} placeholder="Optional description">
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h6><strong>When incoming requests match</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Compose the condition visually, or switch to Expression to edit the raw CEL directly.
					</p>
				</div>
				<div class="flex flex-col items-end gap-1">
					<div class="flex items-center gap-2">
						<div class="tabs is-variant-underline" role="tablist">
							<button type="button" class="tab-button" class:is-active={mode === 'visual'}
								role="tab" aria-selected={mode === 'visual'}
								disabled={!canUseVisual}
								title={canUseVisual ? undefined : 'This expression can’t be shown in the visual editor'}
								onclick={() => { if (canUseVisual) mode = 'visual' }}>
								<i class="fa-solid fa-sliders mr-2"></i>
								<span>Visual</span>
							</button>
							<button type="button" class="tab-button" class:is-active={mode === 'raw'}
								role="tab" aria-selected={mode === 'raw'}
								onclick={() => (mode = 'raw')}>
								<i class="fa-solid fa-code mr-2"></i>
								<span>Expression</span>
							</button>
						</div>
						<button type="button" class="button is-variant-tertiary is-size-small"
							disabled={!draft.expression}
							onclick={clearExpression}>
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

			{#if mode === 'visual'}
				<WafConditionBuilder bind:this={builder} bind:expression={draft.expression} />
			{:else}
				<p class="text-content/60 text-sm">
					Match on
					<code class="font-mono">request.method</code>,
					<code class="font-mono">.path</code>,
					<code class="font-mono">.host</code>,
					<code class="font-mono">.query</code>,
					<code class="font-mono">.uri</code>,
					<code class="font-mono">.scheme</code>,
					<code class="font-mono">.user_agent</code>,
					<code class="font-mono">.referer</code>,
					<code class="font-mono">.remote_ip</code>,
					<code class="font-mono">.country</code>,
					<code class="font-mono">.asn</code>,
					<code class="font-mono">.content_length</code>,
					<code class="font-mono">.body</code>,
					<code class="font-mono">.headers[…]</code>,
					<code class="font-mono">.args[…]</code>,
					<code class="font-mono">.cookies[…]</code>.
				</p>
				<div class="field">
					<label for="rule-expression-raw">Expression (CEL)</label>
					<div class="textarea">
						<textarea id="rule-expression-raw" class="font-mono" rows="5" bind:value={draft.expression}
							placeholder="e.g. request.path.startsWith(&quot;/admin&quot;) && request.method == &quot;POST&quot;"></textarea>
					</div>
				</div>
			{/if}
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Then take action</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Choose what happens to requests that match the condition above.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="rule-action">Action</label>
					<Select id="rule-action" bind:value={draft.action} options={actionOptions} />
				</div>
			</div>

			{#if draft.action === 'block'}
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="field">
						<label for="rule-status">Response status</label>
						<div class="input">
							<input id="rule-status" type="number" bind:value={draft.status} placeholder={String(DEFAULT_STATUS)}>
						</div>
					</div>
					<div class="field">
						<label for="rule-message">Response message</label>
						<div class="input">
							<input id="rule-message" bind:value={draft.message} placeholder={DEFAULT_MESSAGE}>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<hr>

		<div class="flex items-center gap-3">
			<GuardedButton permission="waf.set" type="submit" loading={saving} disabled={saving || !hasCondition}
				title={hasCondition ? undefined : 'Add at least one condition before saving'}>Save</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			{#if !hasCondition}
				<p class="text-content/50 text-sm">Configure at least one condition to save this rule.</p>
			{/if}
		</div>
	</form>

	<hr>

	<!-- Test the draft's expression BEFORE saving — the headline UX win. -->
	<WafTestPanel {project} {location} expression={draft.expression} />
</div>
