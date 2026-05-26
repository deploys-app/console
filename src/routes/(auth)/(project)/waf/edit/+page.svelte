<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import WafConditionBuilder from '$lib/components/WafConditionBuilder.svelte'
	import {
		DEFAULT_STATUS,
		DEFAULT_MESSAGE,
		ruleForm,
		genId,
		normalizeRules,
		toApiRules
	} from '$lib/waf/rules'

	const { data } = $props()

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

	// Expression editing mode — Visual (condition builder) or Expression (raw
	// CEL textarea). Both edit the same `draft.expression` string, so switching
	// preserves whatever is there.
	let mode = $state(/** @type {'visual' | 'raw'} */ ('visual'))

	/** @type {{ clearExpression: () => void } | undefined} */
	let builder = $state()

	function clearExpression () {
		if (builder) builder.clearExpression()
		else draft.expression = ''
	}

	function backToList () {
		return goto(`/waf?project=${project}&location=${encodeURIComponent(location)}`)
	}

	/** @param {Event} e */
	async function save (e) {
		e.preventDefault()
		if (saving) return

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
				rules: toApiRules(nextRules)
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await backToList()
		} finally {
			saving = false
		}
	}

	function cancel () {
		backToList()
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6>Firewall</h6></a>
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

	<form class="grid gap-6 w-full" onsubmit={save}>
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
				<div class="flex items-center gap-2">
					<div class="tabs is-variant-underline" role="tablist">
						<button type="button" class="tab-button" class:is-active={mode === 'visual'}
							role="tab" aria-selected={mode === 'visual'}
							onclick={() => (mode = 'visual')}>
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
			</div>

			{#if mode === 'visual'}
				<WafConditionBuilder bind:this={builder} bind:expression={draft.expression} showPreview={false} />
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
							placeholder="e.g. hasPrefixAny(request.path, [&quot;/admin&quot;]) && request.method == &quot;POST&quot;"></textarea>
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

		<div class="flex gap-3">
			<button class="button" class:is-loading={saving}>Save</button>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
		</div>
	</form>
</div>
