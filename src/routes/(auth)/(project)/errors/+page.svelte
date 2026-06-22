<script lang="ts">
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const project = $derived(data.project)

	// Reading errors is gated by the error.list permission, matching the
	// per-deployment Errors tab (keep in lockstep with the server).
	const READ_PERMISSION = 'error.list'

	type StatusFilter = Api.ErrorStatusFilter

	const STATUS_FILTERS: { value: StatusFilter, label: string }[] = [
		{ value: 'open', label: 'Open' },
		{ value: 'resolved', label: 'Resolved' },
		{ value: 'muted', label: 'Muted' },
		{ value: 'all', label: 'All' }
	]

	// Server-side ordering (error.list `sort`). Default keeps the freshest issue on
	// top; "Count" surfaces the loudest, which is what you usually want to triage.
	const SORT_OPTIONS: { value: Api.ErrorSort, label: string }[] = [
		{ value: 'lastSeen', label: 'Last seen' },
		{ value: 'count', label: 'Count' },
		{ value: 'firstSeen', label: 'First seen' }
	]

	// Short, language-coloured kind badges. Hues are token-based so they recolour
	// with the theme. Kept LOCAL, mirroring the per-deployment Errors tab.
	const KIND_META: Record<Api.ErrorKind, { label: string, hue: number }> = {
		go: { label: 'Go', hue: 198 },
		java: { label: 'Java', hue: 18 },
		python: { label: 'Py', hue: 142 },
		node: { label: 'Node', hue: 96 },
		ruby: { label: 'Ruby', hue: 355 },
		generic: { label: 'Generic', hue: 250 }
	}

	function kindMeta (kind: Api.ErrorKind) {
		return KIND_META[kind] ?? { label: kind, hue: 250 }
	}

	// Eight evenly-spaced hues; hashing the deployment name into the palette gives
	// every deployment a stable, distinguishable colour (local copy).
	const POD_HUES = [355, 28, 48, 142, 175, 205, 260, 312]

	function nameHue (s: string): number {
		let h = 0
		for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
		return POD_HUES[Math.abs(h) % POD_HUES.length]
	}

	// ts is ISO 8601; nowMs is a shared "now" tick so all rows refresh together.
	function relTime (ts: string, nowMs: number): string {
		const t = Date.parse(ts)
		if (isNaN(t)) return ''
		const diff = Math.max(0, nowMs - t)
		if (diff < 1000) return 'now'
		if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
		return `${Math.floor(diff / 86_400_000)}d`
	}

	// Deep-link to this issue on the owning deployment's Errors tab, where the
	// full detail + triage (resolve / mute / reopen) lives.
	function issueHref (issue: Api.ErrorIssue): string {
		const q = new URLSearchParams({
			project,
			location: issue.location,
			name: issue.deployment,
			// Carry the issue id so the deployment tab opens it expanded.
			id: issue.id
		})
		return `/deployment/errors?${q.toString()}`
	}

	let status = $state<StatusFilter>('open')
	let sort = $state<Api.ErrorSort>('lastSeen')
	let query = $state('')
	let issues = $state<Api.ErrorIssue[]>([])
	let nextCursor = $state<string | undefined>(undefined)
	let loading = $state(false)
	let loadingMore = $state(false)
	let loadMoreError = $state(false)
	// Distinguish "no data yet" from the various terminal states so we never flash
	// the empty state before the first fetch resolves.
	let loaded = $state(false)
	let forbidden = $state(false)
	let errorMessage = $state('')
	let now = $state(Date.now())

	const visibleIssues = $derived.by(() => {
		const q = query.trim().toLowerCase()
		if (!q) return issues
		return issues.filter((it) =>
			it.title.toLowerCase().includes(q) ||
			it.kind.toLowerCase().includes(q) ||
			it.deployment.toLowerCase().includes(q) ||
			it.location.toLowerCase().includes(q) ||
			it.samplePod.toLowerCase().includes(q))
	})

	function classifyError (resp: Api.Response<unknown>): void {
		forbidden = false
		errorMessage = ''
		if (resp.error?.forbidden) {
			forbidden = true
			return
		}
		errorMessage = resp.error?.message || 'Failed to load application errors.'
	}

	async function loadIssues (): Promise<void> {
		loading = true
		// Reset terminal states on each fresh load so a filter change after a
		// forbidden response can recover.
		forbidden = false
		errorMessage = ''
		// A prior page's load-more failure must not haunt a freshly loaded list.
		loadMoreError = false
		// Project-wide listing: error.list with no `name` aggregates issues
		// across every deployment in the project.
		const resp = await api.invoke<Api.ErrorListResult>('error.list', {
			project,
			status,
			sort
		}, fetch)
		if (resp.ok) {
			issues = resp.result.issues ?? []
			nextCursor = resp.result.nextCursor || undefined
		} else {
			issues = []
			nextCursor = undefined
			classifyError(resp)
		}
		loaded = true
		loading = false
	}

	async function loadMore (): Promise<void> {
		if (!nextCursor || loadingMore) return
		loadingMore = true
		loadMoreError = false
		const resp = await api.invoke<Api.ErrorListResult>('error.list', {
			project,
			status,
			sort,
			cursor: nextCursor
		}, fetch)
		if (resp.ok) {
			issues = [...issues, ...(resp.result.issues ?? [])]
			nextCursor = resp.result.nextCursor || undefined
		} else {
			loadMoreError = true
		}
		loadingMore = false
	}

	// Label the loaded count with the active filter's noun, so it stays accurate
	// whichever status is selected (e.g. "3 open", "2 resolved", "6 issues").
	const countLabel = $derived(
		query.trim()
			? `${visibleIssues.length} of ${issues.length} shown`
			: status === 'all'
				? `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`
				: `${issues.length} ${status}`
	)

	onMount(() => {
		loadIssues()
		const ticker = setInterval(() => { now = Date.now() }, 1000)
		return () => clearInterval(ticker)
	})

	// Reload when the status filter or sort changes (after the first mount).
	// Reading both here is what subscribes the effect to their changes.
	let trackedListKey = $state<string | null>(null)
	$effect(() => {
		const key = `${status} ${sort}`
		if (trackedListKey === key) return
		const first = trackedListKey === null
		trackedListKey = key
		if (!first) loadIssues()
	})
</script>

<style>
	.errors-shell {
		--shell-divider: hsl(var(--hsl-content) / 0.08);
		--shell-bg: hsl(var(--hsl-base-100));
		display: flex;
		flex-direction: column;
		background: var(--shell-bg);
		border: 1px solid var(--shell-divider);
		border-radius: 10px;
		overflow: hidden;
		font-feature-settings: 'tnum' 1;
	}

	.errors-rail {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--shell-divider);
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-primary);
		flex-wrap: wrap;
	}

	.errors-rail__brand {
		margin: 0;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		font-size: 0.9rem;
	}

	.errors-rail__count {
		color: hsl(var(--hsl-content) / 0.5);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}

	.errors-rail__spacer { flex: 1; }

	/* status filter pills */
	.filter-pills {
		display: inline-flex;
		background: hsl(var(--hsl-content) / 0.05);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 7px;
		padding: 2px;
		gap: 2px;
	}

	.filter-pill {
		border: none;
		background: transparent;
		border-radius: 5px;
		padding: 0 0.65rem;
		height: 1.6rem;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.55);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
	}
	.filter-pill:hover { color: hsl(var(--hsl-content) / 0.85); }
	.filter-pill[data-active='true'] {
		background: hsl(var(--hsl-base-100));
		color: hsl(var(--hsl-content));
		box-shadow: 0 1px 2px hsl(var(--hsl-content) / 0.1);
	}

	/* Compact rail search, matching the per-deployment Errors tab — the .input
	   component class can't be used here (its min-height: 2.5rem towers over the
	   ~1.85rem status pills next to it). */
	.filter-search {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 1.85rem;
		padding: 0 0.55rem;
		background: hsl(var(--hsl-content) / 0.04);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 6px;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.filter-search:focus-within {
		border-color: hsl(var(--hsl-primary) / 0.5);
		background: hsl(var(--hsl-base-100));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08);
	}
	.filter-search__icon { font-size: 0.625rem; color: hsl(var(--hsl-content) / 0.4); }
	.filter-search__input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content));
		width: 11rem;
	}
	.filter-search__input::placeholder { color: hsl(var(--hsl-content) / 0.4); letter-spacing: 0.02em; }
	.filter-search__clear {
		background: transparent;
		border: none;
		padding: 0 0.1rem;
		color: hsl(var(--hsl-content) / 0.4);
		cursor: pointer;
		font-size: 0.625rem;
		line-height: 1;
	}
	.filter-search__clear:hover { color: hsl(var(--hsl-content)); }

	/* sort selector — compact native select sized to sit in the rail next to the
	   status pills (the .select component class is too tall, like .input). */
	.sort-control {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.sort-control__label {
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.5);
	}
	.sort-control__field {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.sort-control__select {
		appearance: none;
		-webkit-appearance: none;
		height: 1.85rem;
		padding: 0 1.6rem 0 0.55rem;
		background: hsl(var(--hsl-content) / 0.04);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 6px;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.sort-control__select:hover { background: hsl(var(--hsl-content) / 0.07); }
	.sort-control__select:focus-visible {
		outline: none;
		border-color: hsl(var(--hsl-primary) / 0.5);
		background: hsl(var(--hsl-base-100));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08);
	}
	.sort-control__chevron {
		position: absolute;
		right: 0.55rem;
		font-size: 0.625rem;
		color: hsl(var(--hsl-content) / 0.4);
		pointer-events: none;
	}

	/* surface */
	.errors-surface {
		position: relative;
		flex: 1;
		min-height: 14rem;
		max-height: calc(100dvh - 18rem);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.issue-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.issue-item { border-bottom: 1px solid hsl(var(--hsl-content) / 0.05); }
	.issue-item:last-child { border-bottom: none; }

	.issue-row {
		display: grid;
		grid-template-columns: [kind] 4.25rem [deployment] 9rem [title] 1fr [count] auto [time] 3rem [status] 5.25rem;
		align-items: center;
		column-gap: 0.85rem;
		width: 100%;
		padding: 0.65rem 1rem;
		border: none;
		background: transparent;
		text-align: left;
		text-decoration: none;
		font-family: var(--ffml-primary);
		transition: background-color 0.12s ease;
	}
	.issue-row:hover { background: hsl(var(--hsl-content) / 0.035); }

	.kind-badge {
		grid-column: kind;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.12rem 0;
		width: 100%;
		border-radius: 5px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		background: hsl(var(--kind-hue) 60% 50% / 0.2);
		color: hsl(var(--kind-hue) 64% 38%);
		border: 1px solid hsl(var(--kind-hue) 60% 50% / 0.36);
	}
	:global(.dark) .kind-badge {
		background: hsl(var(--kind-hue) 60% 60% / 0.16);
		color: hsl(var(--kind-hue) 70% 72%);
		border-color: hsl(var(--kind-hue) 60% 60% / 0.3);
	}

	/* deployment column — the column that distinguishes this project-wide view
	   from the per-deployment tab. */
	.issue-deployment {
		grid-column: deployment;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.issue-deployment__name {
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--name-hue) 55% 42%);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	:global(.dark) .issue-deployment__name { color: hsl(var(--name-hue) 65% 70%); }
	.issue-deployment__loc {
		font-size: 0.625rem;
		color: hsl(var(--hsl-content) / 0.4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.issue-title {
		grid-column: title;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.issue-title__text {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		/* Clamp to two lines so the meaningful tail of a message survives (e.g. the
		   property name in "TypeError: Cannot read properties of undefined (…'id')"). */
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
	.issue-title__pod {
		font-family: var(--ffml-mono);
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.issue-count {
		grid-column: count;
		font-variant-numeric: tabular-nums;
		/* Count is the severity signal — give it weight on par with the title
		   instead of burying it smaller and dimmer. */
		font-size: 0.8125rem;
		font-weight: 700;
		color: hsl(var(--hsl-content) / 0.9);
		display: inline-flex;
		align-items: baseline;
		gap: 0.25rem;
	}
	.issue-count__unit { font-size: 0.625rem; font-weight: 500; color: hsl(var(--hsl-content) / 0.4); }

	.issue-time {
		grid-column: time;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.45);
		cursor: help;
	}

	.status-chip {
		grid-column: status;
		justify-self: end;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}
	.status-chip::before {
		content: '';
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: currentColor;
	}
	.status-chip[data-status='open'] {
		background: hsl(var(--hsl-negative) / 0.12);
		color: hsl(var(--hsl-negative));
	}
	.status-chip[data-status='resolved'] {
		background: hsl(var(--hsl-positive) / 0.12);
		color: hsl(var(--hsl-positive));
	}
	.status-chip[data-status='muted'] {
		/* muted was near-invisible in light mode at 0.08/0.55 */
		background: hsl(var(--hsl-content) / 0.12);
		color: hsl(var(--hsl-content) / 0.7);
	}
	/* Chips had no dark-mode lift (unlike .kind-badge), so the tints washed out on
	   the dark surface — raise the fills in dark. */
	:global(.dark) .status-chip[data-status='open'] { background: hsl(var(--hsl-negative) / 0.22); }
	:global(.dark) .status-chip[data-status='resolved'] { background: hsl(var(--hsl-positive) / 0.22); }
	:global(.dark) .status-chip[data-status='muted'] {
		background: hsl(var(--hsl-content) / 0.16);
		color: hsl(var(--hsl-content) / 0.72);
	}

	/* states */
	.state-pane {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: 18rem;
		padding: 3rem 1.5rem;
		text-align: center;
		font-family: var(--ffml-primary);
	}
	.state-pane__icon {
		width: 2.5rem;
		height: 2.5rem;
		color: hsl(var(--hsl-content) / 0.3);
	}
	.state-pane__title {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.7);
	}
	.state-pane__hint {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.45);
		max-width: 26rem;
	}

	.load-more-bar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}
	.load-more-hint {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.5);
		text-align: center;
	}
	.load-more-error {
		font-size: 0.75rem;
		color: hsl(var(--hsl-negative));
		text-align: center;
	}

	@media (max-width: 768px) {
		.issue-row {
			grid-template-columns: [kind] 3.5rem [deployment] 6rem [title] 1fr [count] auto [status] auto;
			row-gap: 0.2rem;
		}
		.issue-time { display: none; }
	}
</style>

<div class="page-head">
	<div>
		<h4><strong>Errors</strong></h4>
		<p class="page-sub">Application errors across every deployment in this project</p>
	</div>
</div>

<div class="errors-shell">
	<header class="errors-rail">
		<h6 class="errors-rail__brand">Issues</h6>
		{#if loaded && !forbidden && !errorMessage}
			<span class="errors-rail__count">{countLabel}</span>
		{/if}

		<span class="errors-rail__spacer"></span>

		<div class="filter-pills" role="tablist" aria-label="Status filter">
			{#each STATUS_FILTERS as f (f.value)}
				<button
					type="button"
					class="filter-pill"
					role="tab"
					aria-selected={status === f.value}
					data-active={status === f.value}
					onclick={() => (status = f.value)}>
					{f.label}
				</button>
			{/each}
		</div>

		<label class="sort-control">
			<span class="sort-control__label">Sort</span>
			<span class="sort-control__field">
				<select class="sort-control__select" bind:value={sort} aria-label="Sort issues by">
					{#each SORT_OPTIONS as o (o.value)}
						<option value={o.value}>{o.label}</option>
					{/each}
				</select>
				<i class="fa-solid fa-chevron-down sort-control__chevron" aria-hidden="true"></i>
			</span>
		</label>

		<label class="filter-search">
			<i class="fa-solid fa-magnifying-glass filter-search__icon" aria-hidden="true"></i>
			<input
				class="filter-search__input"
				type="text"
				placeholder="Filter issues…"
				aria-label="Filter issues"
				spellcheck="false"
				autocomplete="off"
				bind:value={query} />
			{#if query}
				<button type="button" class="filter-search__clear" onclick={() => (query = '')} aria-label="Clear filter">
					<i class="fa-solid fa-xmark"></i>
				</button>
			{/if}
		</label>
	</header>

	<main class="errors-surface">
		{#if loading && !issues.length}
			<div class="state-pane">
				<div class="state-pane__title">Loading errors…</div>
			</div>
		{:else if forbidden}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<rect x="3" y="11" width="18" height="11" rx="2"></rect>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
				</svg>
				<div class="state-pane__title">You don't have access to errors</div>
				<div class="state-pane__hint">Viewing application errors requires the <code>{READ_PERMISSION}</code> permission.</div>
			</div>
		{:else if errorMessage}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<circle cx="12" cy="12" r="9"></circle>
					<path d="M12 8v4M12 16h.01"></path>
				</svg>
				<div class="state-pane__title">Couldn't load errors</div>
				<div class="state-pane__hint">{errorMessage}</div>
				<button
					type="button"
					class="button is-variant-secondary is-size-small"
					class:is-loading={loading}
					onclick={loadIssues}>
					Try again
				</button>
			</div>
		{:else if visibleIssues.length === 0}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<path d="M9 12l2 2 4-4"></path>
					<circle cx="12" cy="12" r="9"></circle>
				</svg>
				<div class="state-pane__title">
					{query.trim() ? 'No issues match your filter.' : 'No application errors across this project.'}
				</div>
				{#if !query.trim()}
					<div class="state-pane__hint">Stack traces and unhandled exceptions printed by your apps would show up here.</div>
				{/if}
			</div>
		{:else}
			<ul class="issue-list">
				{#each visibleIssues as issue (issue.id)}
					{@const meta = kindMeta(issue.kind)}
					<li class="issue-item">
						<a class="issue-row" href={issueHref(issue)}>
							<span class="kind-badge" style={`--kind-hue: ${meta.hue}`}>{meta.label}</span>
							<span class="issue-deployment" style={`--name-hue: ${nameHue(issue.deployment)}`}>
								<span class="issue-deployment__name" title={issue.deployment}>{issue.deployment}</span>
								<span class="issue-deployment__loc" title={issue.location}>{issue.location}</span>
							</span>
							<span class="issue-title">
								<span class="issue-title__text" title={issue.title}>{issue.title}</span>
								<span class="issue-title__pod" title={issue.samplePod}>{issue.samplePod}</span>
							</span>
							<span class="issue-count" title={`${issue.count} occurrences`}>
								{issue.count.toLocaleString()}<span class="issue-count__unit">×</span>
							</span>
							<span class="issue-time" title={issue.lastSeen}>{relTime(issue.lastSeen, now)}</span>
							<span class="status-chip" data-status={issue.status}>{issue.status}</span>
						</a>
					</li>
				{/each}
			</ul>

			{#if nextCursor}
				<div class="load-more-bar">
					{#if query.trim()}
						<!-- The filter runs over loaded rows only, so paging more in while a
						     query is active just hides them — explain instead of an inert button. -->
						<span class="load-more-hint">Filter applies to loaded issues only — clear it to load more.</span>
					{:else}
						{#if loadMoreError}
							<span class="load-more-error">Couldn't load more issues.</span>
						{/if}
						<button
							type="button"
							class="button is-variant-secondary is-size-small"
							class:is-loading={loadingMore}
							disabled={loadingMore}
							onclick={loadMore}>
							{loadMoreError ? 'Try again' : 'Load more'}
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</main>
</div>
