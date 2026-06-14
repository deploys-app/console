<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafConditionBuilder from '$lib/components/WafConditionBuilder.svelte'
	import { parseExpression } from '$lib/waf/expression'
	import {
		overrideForm,
		genId,
		normalizeOverrides,
		toApiOverrides,
		ttlOptions
	} from '$lib/cache/overrides'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	const actionOptions = [
		{ value: 'cache', label: 'Cache — force a caching policy onto matching responses' },
		{ value: 'bypass', label: 'Bypass — skip the cache entirely for matching requests' }
	]

	const policyOptions = [
		{ value: 'conservative', label: 'Conservative — respect the origin’s Cache-Control most' },
		{ value: 'balanced', label: 'Balanced' },
		{ value: 'aggressive', label: 'Aggressive — override the origin’s Cache-Control hardest' }
	]

	const modeOptions = [
		{ value: 'enforce', label: 'Enforce — change caching for matching requests' },
		{ value: 'shadow', label: 'Shadow — only count, never change caching' }
	]

	// The whole loaded zone's overrides (ordered) are held in memory so Save can
	// rewrite the entire zone with the edited override in place — cache.set
	// replaces the zone, so the rest must be echoed back untouched.
	const overrides = untrack(() => normalizeOverrides(data.zone?.overrides))
	const description = untrack(() => data.zone?.description ?? '')
	// Index of the override being edited, or -1 when adding a brand-new one.
	const editIndex = untrack(() => (data.overrideId ? overrides.findIndex((o) => o.id === data.overrideId) : -1))
	const isCreate = editIndex === -1

	// Working-copy draft — Cancel discards it without touching the server.
	const draft = $state(untrack(() => {
		if (isCreate) {
			const taken = overrides.map((o) => o.id)
			return { ...overrideForm(), id: genId(taken) }
		}
		const seed = overrides[editIndex]
		return { ...seed, status: [...seed.status] }
	}))

	// The status list is edited as a comma-separated string of HTTP statuses
	// (cache action only). Seed it from the draft and parse on save.
	let statusText = $state(untrack(() => draft.status.join(', ')))

	let saving = $state(false)

	// Filter editing mode — Visual (condition builder) or Expression (raw CEL
	// textarea), same pattern as the WAF editors. The filter is optional: empty
	// means the override applies to every request.
	const canUseVisual = $derived(parseExpression(draft.filter) !== null)
	let filterMode = $state(/** @type {'visual' | 'raw'} */ (
		untrack(() => (parseExpression(draft.filter) !== null ? 'visual' : 'raw'))
	))

	// If we're in Visual but the filter becomes non-representable, fall back to
	// raw so the disabled Visual tab can't show stale rows.
	$effect(() => {
		if (filterMode === 'visual' && !canUseVisual) filterMode = 'raw'
	})

	/** @type {{ clearExpression: () => void } | undefined} */
	let filterBuilder = $state()

	function clearFilter () {
		if (filterMode === 'visual' && filterBuilder) filterBuilder.clearExpression()
		else draft.filter = ''
	}

	// A loaded zone may carry a ttl outside the presets (the API accepts any
	// 1s..720h Go duration) — keep it selectable so editing preserves it.
	const allTtlOptions = $derived(
		ttlOptions.some((o) => o.value === draft.ttl)
			? ttlOptions
			: [...ttlOptions, { value: draft.ttl, label: draft.ttl }]
	)

	// Save gate: a cache override needs a ttl; bypass needs nothing extra.
	const canSave = $derived(draft.action === 'bypass' || !!draft.ttl)

	function backToManage () {
		return goto(`/cache/manage?project=${project}&location=${encodeURIComponent(location)}`)
	}

	/** @param {Event} e */
	async function save (e) {
		e.preventDefault()
		if (saving || !canSave) return

		// Parse the comma-separated status list into positive integers (cache only).
		/** @type {number[]} */
		const status = statusText
			.split(',')
			.map((s) => Number(s.trim()))
			.filter((s) => Number.isInteger(s) && s > 0)

		const edited = { ...draft, status }

		saving = true
		try {
			// Rebuild the zone's override list with the edited override replaced by
			// id (or appended for create), then write the whole zone.
			let nextOverrides
			if (isCreate) {
				nextOverrides = [...overrides, edited]
			} else {
				nextOverrides = overrides.map((o) => (o.id === edited.id ? edited : o))
			}

			const resp = await api.invoke('cache.set', {
				project,
				location,
				description,
				overrides: toApiOverrides(nextOverrides)
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

	// Enter inside a text field (description, ttl/stale inputs, status list) must
	// not implicitly submit the override. Saving is deliberate, via the Save
	// button (a <button>, where Enter still works) and the raw-CEL <textarea>.
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
		<a href={`/cache?project=${project}`} class="link"><h6>Cache</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/cache/manage?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6 class="font-mono">{location}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{isCreate ? 'Add override' : 'Edit override'}</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>{isCreate ? 'Add override' : 'Edit override'}</strong></h3>
		</div>
		<p class="page-sub">Cache override in <span class="font-mono">{location}</span></p>
	</div>

	<hr>

	<form class="grid gap-6 w-full" onsubmit={save} use:blockEnterSubmit>
		<div class="field">
			<label for="override-description">Description</label>
			<div class="input">
				<input id="override-description" bind:value={draft.description} placeholder="Optional description">
			</div>
		</div>

		<hr>

		<div class="grid gap-4">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h6><strong>Apply to matching requests</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Optional — leave empty to apply this override to every request.
						Only matching requests are affected.
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
					<code class="font-mono">request.body</code> is always empty here — cache decisions run before the body is read.
				</p>
				<div class="field">
					<label for="override-filter-raw">Filter (CEL)</label>
					<div class="textarea">
						<textarea id="override-filter-raw" class="font-mono" rows="5" bind:value={draft.filter}
							placeholder="e.g. request.path.startsWith(&quot;/static/&quot;)"></textarea>
					</div>
				</div>
			{/if}
		</div>

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Then take action</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Choose how matching requests are cached at the edge.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="override-action">Action</label>
					<Select id="override-action" bind:value={draft.action} options={actionOptions} />
				</div>
			</div>
		</div>

		{#if draft.action === 'cache'}
			<hr>

			<div class="grid gap-4">
				<div>
					<h6><strong>Caching policy</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Force matching responses to be cached for this lifetime, overriding
						the origin’s Cache-Control to the chosen degree.
					</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<!-- fixed width so the row doesn't reflow when the selected
					     ttl label changes length (e.g. 1 minute → 7 days) -->
					<div class="field">
						<label for="override-ttl">Cache lifetime (TTL)</label>
						<Select id="override-ttl" bind:value={draft.ttl} options={allTtlOptions} editable
							placeholder="e.g. 1h" />
					</div>
					<div class="field">
						<label for="override-policy">Policy</label>
						<Select id="override-policy" bind:value={draft.policy} options={policyOptions} />
					</div>
				</div>
			</div>

			<hr>

			<div class="grid gap-4">
				<div>
					<h6><strong>Stale serving</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Optional RFC 5861 windows — serve a stale response while revalidating
						in the background, or when the origin errors.
					</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="field">
						<label for="override-swr">Stale while revalidate</label>
						<div class="input">
							<input id="override-swr" class="font-mono" bind:value={draft.staleWhileRevalidate}
								placeholder="e.g. 30s">
						</div>
					</div>
					<div class="field">
						<label for="override-sie">Stale if error</label>
						<div class="input">
							<input id="override-sie" class="font-mono" bind:value={draft.staleIfError}
								placeholder="e.g. 1h">
						</div>
					</div>
				</div>
			</div>

			<hr>

			<div class="grid gap-4">
				<div>
					<h6><strong>Origin statuses</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						Optional — force only these origin response statuses. Leave empty to
						force every cacheable status. Comma-separated, e.g. <code class="font-mono">200, 301</code>.
					</p>
				</div>

				<div class="field sm:max-w-md">
					<label for="override-status">Statuses</label>
					<div class="input">
						<input id="override-status" class="font-mono" bind:value={statusText}
							placeholder="e.g. 200, 301, 404">
					</div>
				</div>
			</div>
		{/if}

		<hr>

		<div class="grid gap-4">
			<div>
				<h6><strong>Mode</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Shadow mode counts matches without changing caching — size an override
					here before enforcing it.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="override-mode">Mode</label>
					<Select id="override-mode" bind:value={draft.mode} options={modeOptions} />
				</div>
			</div>
		</div>

		<hr>

		<div class="flex items-center gap-3">
			<GuardedButton permission="cache.set" type="submit" loading={saving} disabled={saving || !canSave}
				title={canSave ? undefined : 'Set a cache lifetime before saving'}>Save</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			{#if !canSave}
				<p class="text-content/50 text-sm">Set a cache lifetime (TTL) to save this override.</p>
			{/if}
		</div>
	</form>
</div>
