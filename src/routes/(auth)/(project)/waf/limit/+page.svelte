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
	import { normalizeRules, toApiRules } from '$lib/waf/rules'
	import type { KeyRow } from '$lib/waf/limits'
	import {
		DEFAULT_LIMIT_MESSAGE,
		keyTypeLabels,
		limitForm,
		genLimitId,
		normalizeLimits,
		toApiLimits,
		windowOptions
	} from '$lib/waf/limits'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	const keyTypeOptions = Object.entries(keyTypeLabels)
		.map(([value, label]) => ({ value, label }))

	const algorithmOptions = [
		{ value: 'fixed', label: 'Fixed window' },
		{ value: 'sliding', label: 'Sliding window' }
	]

	const modeOptions = [
		{ value: 'enforce', label: 'Enforce — reject over-limit requests' },
		{ value: 'shadow', label: 'Shadow — only count, never reject' }
	]

	const statusOptions = [
		{ value: 429, label: '429 Too Many Requests' },
		{ value: 503, label: '503 Service Unavailable' }
	]

	// The whole loaded zone (rules + limits) is held in memory so Save can
	// rewrite the entire zone with the edited limit in place — waf.set replaces
	// the zone, so rules must be echoed back untouched.
	const rules = untrack(() => normalizeRules(data.zone?.rules))
	const limits = untrack(() => normalizeLimits(data.zone?.limits))
	const description = untrack(() => data.zone?.description ?? '')
	// Index of the limit being edited, or -1 when adding a brand-new limit.
	const editIndex = untrack(() => (data.limitId ? limits.findIndex((l) => l.id === data.limitId) : -1))
	const isCreate = editIndex === -1

	// Working-copy draft — Cancel discards it without touching the server.
	const draft = $state(untrack(() => {
		if (isCreate) {
			const taken = limits.map((l) => l.id)
			return { ...limitForm(), id: genLimitId(taken) }
		}
		// Deep-copy the key rows so edits don't leak into `limits`.
		const seed = limits[editIndex]
		return { ...seed, key: seed.key.map((k) => ({ ...k })) }
	}))

	let saving = $state(false)

	// Filter editing mode — Visual (condition builder) or Expression (raw CEL
	// textarea), same pattern as the rule editor. The filter is optional: empty
	// means the limit applies to every request.
	const canUseVisual = $derived(parseExpression(draft.filter) !== null)
	let filterMode = $state<'visual' | 'raw'>(
		untrack(() => (parseExpression(draft.filter) !== null ? 'visual' : 'raw'))
	)

	// If we're in Visual but the filter becomes non-representable, fall back to
	// raw so the disabled Visual tab can't show stale rows.
	$effect(() => {
		if (filterMode === 'visual' && !canUseVisual) filterMode = 'raw'
	})

	let filterBuilder = $state<{ clearExpression:() => void }>()

	function clearFilter () {
		if (filterMode === 'visual' && filterBuilder) filterBuilder.clearExpression()
		else draft.filter = ''
	}

	// A loaded zone may carry a window outside the presets (the API accepts any
	// 1s..1h Go duration) — keep it selectable so editing preserves it.
	const allWindowOptions = $derived(
		windowOptions.some((o) => o.value === draft.window)
			? windowOptions
			: [...windowOptions, { value: draft.window, label: draft.window }]
	)

	// Save gates: a positive rate, a window, and every header/cookie key row
	// must carry a name (the other key types are complete on their own).
	const keysComplete = $derived(
		draft.key.length > 0 &&
		draft.key.every((row) => (row.type !== 'header' && row.type !== 'cookie') || !!row.name.trim())
	)
	const canSave = $derived(Number(draft.rate) >= 1 && !!draft.window && keysComplete)

	function addKeyRow () {
		draft.key = [...draft.key, ({ type: 'ip', name: '' } as KeyRow)]
	}

	function removeKeyRow (i: number) {
		draft.key = draft.key.filter((_, idx) => idx !== i)
	}

	function backToManage () {
		return goto(`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`)
	}

	async function save (e: Event) {
		e.preventDefault()
		if (saving || !canSave) return

		saving = true
		try {
			// Rebuild the zone's limit list with the edited limit replaced by id (or
			// appended for create), then write the whole zone.
			let nextLimits
			if (isCreate) {
				nextLimits = [...limits, { ...draft }]
			} else {
				nextLimits = limits.map((l) => (l.id === draft.id ? { ...draft } : l))
			}

			const resp = await api.invoke('waf.set', {
				project,
				location,
				description,
				rules: toApiRules(rules),
				limits: toApiLimits(nextLimits)
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

	// Enter inside a text field (description/rate/message, the key name inputs)
	// must not implicitly submit the limit. Saving is deliberate, via the Save
	// button (a <button>, where Enter still works).
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
		<h6>{isCreate ? 'Add limit' : 'Edit limit'}</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>{isCreate ? 'Add limit' : 'Edit limit'}</strong></h3>
		</div>
		<p class="page-sub">Rate limit in <span class="font-mono">{location}</span></p>
	</div>

	<hr>

	<form class="grid gap-6 w-full" onsubmit={save} use:blockEnterSubmit>
		<div class="field">
			<label for="limit-description">Description</label>
			<div class="input">
				<input id="limit-description" bind:value={draft.description} placeholder="Optional description">
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h6><strong>Apply to matching requests</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Optional — leave empty to apply this limit to every request.
						Only matching requests are counted against the limit.
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
					<code class="font-mono">.user_agent</code>,
					<code class="font-mono">.referer</code>,
					<code class="font-mono">.remote_ip</code>,
					<code class="font-mono">.country</code>,
					<code class="font-mono">.asn</code>,
					<code class="font-mono">.content_length</code>,
					<code class="font-mono">.headers[…]</code>,
					<code class="font-mono">.args[…]</code>,
					<code class="font-mono">.cookies[…]</code>.
					<code class="font-mono">request.body</code> is always empty here — rate limits run before the body is read.
				</p>
				<div class="field">
					<label for="limit-filter-raw">Filter (CEL)</label>
					<div class="textarea">
						<textarea id="limit-filter-raw" class="font-mono" rows="5" bind:value={draft.filter}
							placeholder="e.g. request.path.startsWith(&quot;/api/&quot;) && request.method == &quot;POST&quot;"></textarea>
					</div>
				</div>
			{/if}
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Count requests by</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Requests sharing every characteristic below share one counter bucket.
					Defaults to client IP.
				</p>
			</div>

			<div class="grid gap-3">
				{#each draft.key as row, i (i)}
					<div class="key-row">
						<div class="grid gap-3 sm:grid-cols-2 flex-1 min-w-0">
							<div class="field">
								<label for={`limit-key-type-${i}`}>Characteristic</label>
								<Select id={`limit-key-type-${i}`} bind:value={row.type} options={keyTypeOptions}
									onchange={() => (row.name = '')} />
							</div>
							{#if row.type === 'header' || row.type === 'cookie'}
								<div class="field">
									<label for={`limit-key-name-${i}`}>Name</label>
									<div class="input">
										<input id={`limit-key-name-${i}`} class="font-mono" bind:value={row.name}
											placeholder={row.type === 'header' ? 'x-api-key' : 'session'}>
									</div>
								</div>
							{/if}
						</div>
						{#if draft.key.length > 1}
							<button type="button" class="key-row-remove button is-variant-tertiary is-size-small"
								aria-label="Remove characteristic" onclick={() => removeKeyRow(i)}>
								<i class="fa-solid fa-trash-can"></i>
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<div class="flex justify-start">
				<button type="button" class="button is-variant-secondary is-size-small" onclick={addKeyRow}>
					<i class="fa-solid fa-plus mr-2"></i>
					<span>Add characteristic</span>
				</button>
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Allow at most</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Requests over this rate are counted — and rejected when enforcing.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<div class="field w-40">
					<label for="limit-rate">Requests</label>
					<div class="input">
						<input id="limit-rate" type="number" min="1" bind:value={draft.rate} placeholder="100">
					</div>
				</div>
				<span class="text-content/60 text-sm mt-6">requests per</span>
				<!-- fixed width so the row doesn't reflow when the selected
				     window label changes length (e.g. 1 second → 30 minutes) -->
				<div class="field w-44">
					<label for="limit-window">Window</label>
					<Select id="limit-window" bind:value={draft.window} options={allWindowOptions} class="w-full" />
				</div>
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Behavior</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Fixed window resets the counter at each window boundary; sliding
					window weighs the previous window for a smoother limit.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="limit-algorithm">Algorithm</label>
					<Select id="limit-algorithm" bind:value={draft.algorithm} options={algorithmOptions} />
				</div>
				<div class="field">
					<label for="limit-mode">Mode</label>
					<Select id="limit-mode" bind:value={draft.mode} options={modeOptions} />
				</div>
			</div>
		</div>

		{#if draft.mode === 'enforce'}
			<hr>

			<div class="grid gap-4">
				<div>
					<h6><strong>Rejection response</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Returned to clients that exceed the limit.
					</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="field">
						<label for="limit-status">Response status</label>
						<Select id="limit-status" bind:value={draft.status} options={statusOptions} />
					</div>
					<div class="field">
						<label for="limit-message">Response message</label>
						<div class="input">
							<input id="limit-message" bind:value={draft.message} placeholder={DEFAULT_LIMIT_MESSAGE}>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<hr>

		<div class="flex items-center gap-3">
			<GuardedButton permission="waf.set" type="submit" loading={saving} disabled={saving || !canSave}
				title={canSave ? undefined : 'Set a rate, window, and complete every key characteristic before saving'}>Save</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			{#if !canSave}
				<p class="text-content/50 text-sm">
					{#if !keysComplete}
						Name every header/cookie characteristic to save this limit.
					{:else}
						Set a rate of at least 1 request per window to save this limit.
					{/if}
				</p>
			{/if}
		</div>
	</form>

	<!-- Test the draft's filter BEFORE saving. An empty filter matches every
	     request — nothing to dry-run, so the panel only shows once one exists. -->
	{#if draft.filter.trim()}
		<hr>
		<WafTestPanel {project} {location} expression={draft.filter} />
	{/if}
</div>

<style>
	.key-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-400) / 0.12);
	}

	:root:not(.dark) .key-row {
		background-color: hsl(var(--hsl-base-100) / 0.6);
	}

	.key-row-remove {
		flex-shrink: 0;
		margin-top: 1.75rem;
	}
</style>
