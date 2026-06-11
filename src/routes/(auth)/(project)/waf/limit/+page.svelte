<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import TagInput from '$lib/components/TagInput.svelte'
	import { normalizeRules, toApiRules } from '$lib/waf/rules'
	import {
		DEFAULT_LIMIT_MESSAGE,
		keyTypeLabels,
		limitForm,
		genLimitId,
		normalizeLimits,
		toApiLimits,
		windowOptions
	} from '$lib/waf/limits'

	const { data } = $props()

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
		// Deep-copy the key rows + exclusions so edits don't leak into `limits`.
		const seed = limits[editIndex]
		return { ...seed, key: seed.key.map((k) => ({ ...k })), exclude: [...seed.exclude] }
	}))

	let saving = $state(false)

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
		draft.key = [...draft.key, /** @type {import('$lib/waf/limits').KeyRow} */ ({ type: 'ip', name: '' })]
	}

	/** @param {number} i */
	function removeKeyRow (i) {
		draft.key = draft.key.filter((_, idx) => idx !== i)
	}

	function backToManage () {
		return goto(`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`)
	}

	/** @param {Event} e */
	async function save (e) {
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

	// Enter inside a text field (description/rate/message, the key name inputs,
	// the exclusion chips) must not implicitly submit the limit — in the
	// TagInput it means "add this CIDR", elsewhere nothing. Saving is
	// deliberate, via the Save button (a <button>, where Enter still works).
	/** @param {HTMLFormElement} node */
	function blockEnterSubmit (node) {
		/** @param {KeyboardEvent} e */
		function onKeydown (e) {
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
				<div class="field">
					<label for="limit-rate">Requests</label>
					<div class="input">
						<input id="limit-rate" type="number" min="1" bind:value={draft.rate} placeholder="100">
					</div>
				</div>
				<span class="text-content/60 text-sm mt-6">requests per</span>
				<div class="field">
					<label for="limit-window">Window</label>
					<Select id="limit-window" bind:value={draft.window} options={allWindowOptions} />
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

		<div class="grid gap-4">
			<div>
				<h6><strong>Exclusions</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Requests from these CIDRs skip this limit.
				</p>
			</div>

			<div class="field">
				<label for="limit-exclude">CIDRs</label>
				<TagInput id="limit-exclude" bind:tags={draft.exclude}
					placeholder="e.g. 203.0.113.0/24, press Enter to add" />
			</div>
		</div>

		<hr>

		<div class="flex items-center gap-3">
			<button class="button" class:is-loading={saving} disabled={saving || !canSave}
				title={canSave ? undefined : 'Set a rate, window, and complete every key characteristic before saving'}>Save</button>
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
