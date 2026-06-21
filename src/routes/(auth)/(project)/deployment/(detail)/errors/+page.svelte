<script lang="ts">
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const deployment = $derived(data.deployment)

	// Triage (resolve/mute/reopen) and read both ride the single deployment.logs
	// permission for v1 (one surface; a dedicated deployment.errors perm may be
	// split out later). Keep this in lockstep with the server-side gate.
	const TRIAGE_PERMISSION = 'deployment.logs'

	// The list endpoint reports this when the deployment's location has no log
	// bucket (error detection permanently unavailable there); we match on the
	// stable substring rather than an error code, mirroring the API contract.
	const UNAVAILABLE_MARKER = 'error detection is not available for this location'

	type StatusFilter = Api.DeploymentErrorStatusFilter

	const STATUS_FILTERS: { value: StatusFilter, label: string }[] = [
		{ value: 'open', label: 'Open' },
		{ value: 'resolved', label: 'Resolved' },
		{ value: 'muted', label: 'Muted' },
		{ value: 'all', label: 'All' }
	]

	// Short, language-coloured kind badges. Hues are token-based so they recolour
	// with the theme. Kept LOCAL to this page on purpose (see PR notes).
	const KIND_META: Record<Api.DeploymentErrorKind, { label: string, hue: number }> = {
		go: { label: 'Go', hue: 198 },
		java: { label: 'Java', hue: 18 },
		python: { label: 'Py', hue: 142 },
		node: { label: 'Node', hue: 96 },
		ruby: { label: 'Ruby', hue: 355 },
		generic: { label: 'Generic', hue: 250 }
	}

	function kindMeta (kind: Api.DeploymentErrorKind) {
		return KIND_META[kind] ?? { label: kind, hue: 250 }
	}

	// Eight evenly-spaced hues; hashing the pod name into the palette gives every
	// pod a stable, distinguishable colour. Local copy (do not import logFormat).
	const POD_HUES = [355, 28, 48, 142, 175, 205, 260, 312]

	function podHue (s: string): number {
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

	let status = $state<StatusFilter>('open')
	let query = $state('')
	let issues = $state<Api.DeploymentErrorIssue[]>([])
	let nextCursor = $state<string | undefined>(undefined)
	let loading = $state(false)
	let loadingMore = $state(false)
	// Distinguish "no data yet" from the various terminal states so we never flash
	// the empty state before the first fetch resolves.
	let loaded = $state(false)
	let forbidden = $state(false)
	let unavailable = $state(false)
	let errorMessage = $state('')
	let now = $state(Date.now())

	// Expanded issue id → its loaded detail (or null while loading).
	let expandedId = $state<string | null>(null)
	let detail = $state<Api.DeploymentErrorIssueDetail | null>(null)
	let detailLoading = $state(false)
	let detailError = $state('')
	// id currently being mutated, so only its buttons show the loading state.
	let updatingId = $state<string | null>(null)

	const visibleIssues = $derived.by(() => {
		const q = query.trim().toLowerCase()
		if (!q) return issues
		return issues.filter((it) =>
			it.title.toLowerCase().includes(q) ||
			it.kind.toLowerCase().includes(q) ||
			it.samplePod.toLowerCase().includes(q))
	})

	function classifyError (resp: Api.Response<unknown>): void {
		forbidden = false
		unavailable = false
		errorMessage = ''
		if (resp.error?.forbidden) {
			forbidden = true
			return
		}
		const msg = resp.error?.message ?? ''
		if (msg.includes(UNAVAILABLE_MARKER)) {
			unavailable = true
			return
		}
		errorMessage = msg || 'Failed to load application errors.'
	}

	async function loadIssues (): Promise<void> {
		loading = true
		// Reset terminal states on each fresh load so a filter change after a
		// forbidden/unavailable response can recover.
		forbidden = false
		unavailable = false
		errorMessage = ''
		// Collapse any open detail — the expanded issue may not exist under the
		// new filter.
		expandedId = null
		detail = null
		const resp = await api.invoke<Api.DeploymentErrorsResult>('deployment.errors', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			status,
			sort: 'lastSeen'
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
		const resp = await api.invoke<Api.DeploymentErrorsResult>('deployment.errors', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			status,
			sort: 'lastSeen',
			cursor: nextCursor
		}, fetch)
		if (resp.ok) {
			issues = [...issues, ...(resp.result.issues ?? [])]
			nextCursor = resp.result.nextCursor || undefined
		}
		loadingMore = false
	}

	async function toggleExpand (issue: Api.DeploymentErrorIssue): Promise<void> {
		if (expandedId === issue.id) {
			expandedId = null
			detail = null
			detailError = ''
			return
		}
		expandedId = issue.id
		detail = null
		detailError = ''
		detailLoading = true
		const resp = await api.invoke<Api.DeploymentErrorGetResult>('deployment.errorGet', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			id: issue.id
		}, fetch)
		// A different row may have been expanded while this was in flight; only
		// apply the result if it's still the active one.
		if (expandedId !== issue.id) return
		if (resp.ok) {
			detail = resp.result.issue
		} else {
			detailError = resp.error?.message || 'Failed to load issue detail.'
		}
		detailLoading = false
	}

	async function updateStatus (issue: Api.DeploymentErrorIssue, next: Api.DeploymentErrorStatus): Promise<void> {
		updatingId = issue.id
		const resp = await api.invoke('deployment.errorUpdate', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			id: issue.id,
			status: next
		}, fetch)
		updatingId = null
		if (!resp.ok) {
			detailError = resp.error?.message || 'Failed to update issue.'
			return
		}
		// Refetch the list so the issue moves to (or out of) the active filter.
		// loadIssues() collapses the open detail (the issue may now be filtered
		// out), so triage from the expanded view closes it on success.
		await loadIssues()
	}

	// Label the loaded count with the active filter's noun, so it stays accurate
	// whichever status is selected (e.g. "3 open", "2 resolved", "6 issues").
	const countLabel = $derived(
		query.trim()
			? `${visibleIssues.length} shown`
			: status === 'all'
				? `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`
				: `${issues.length} ${status}`
	)

	onMount(() => {
		loadIssues()
		const ticker = setInterval(() => { now = Date.now() }, 1000)
		return () => clearInterval(ticker)
	})

	// Reload when the status filter changes (after the first mount). Reading
	// `status` here is what subscribes the effect to its changes.
	let trackedStatus = $state<StatusFilter | null>(null)
	$effect(() => {
		const current = status
		if (trackedStatus === current) return
		const first = trackedStatus === null
		trackedStatus = current
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

	.filter-search {
		height: 1.85rem;
		min-width: 9rem;
		max-width: 16rem;
		flex: 1;
	}

	/* surface */
	.errors-surface {
		position: relative;
		flex: 1;
		min-height: 14rem;
		max-height: calc(100dvh - 28rem);
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
		grid-template-columns: [kind] 4.25rem [title] 1fr [count] auto [time] 3rem [status] 5.25rem;
		align-items: center;
		column-gap: 0.85rem;
		width: 100%;
		padding: 0.65rem 1rem;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		font-family: var(--ffml-primary);
		transition: background-color 0.12s ease;
	}
	.issue-row:hover { background: hsl(var(--hsl-content) / 0.035); }
	.issue-item[data-expanded='true'] .issue-row { background: hsl(var(--hsl-content) / 0.045); }

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
		background: hsl(var(--kind-hue) 60% 50% / 0.14);
		color: hsl(var(--kind-hue) 62% 42%);
		border: 1px solid hsl(var(--kind-hue) 60% 50% / 0.28);
	}
	:global(.dark) .kind-badge {
		background: hsl(var(--kind-hue) 60% 60% / 0.16);
		color: hsl(var(--kind-hue) 70% 72%);
		border-color: hsl(var(--kind-hue) 60% 60% / 0.3);
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.issue-title__pod {
		font-family: var(--ffml-mono);
		font-size: 0.6875rem;
		color: hsl(var(--pod-hue) 55% 45%);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	:global(.dark) .issue-title__pod { color: hsl(var(--pod-hue) 65% 68%); }

	.issue-count {
		grid-column: count;
		font-variant-numeric: tabular-nums;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
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
		background: hsl(var(--hsl-content) / 0.08);
		color: hsl(var(--hsl-content) / 0.55);
	}

	/* detail */
	.issue-detail {
		padding: 0 1rem 1rem;
		background: hsl(var(--hsl-content) / 0.02);
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}

	.detail-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.75rem 0 0.85rem;
	}

	.detail-meta {
		margin-left: auto;
		display: flex;
		gap: 1rem;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.5);
		font-family: var(--ffml-primary);
		flex-wrap: wrap;
	}
	.detail-meta strong { color: hsl(var(--hsl-content) / 0.75); font-weight: 600; }

	.detail-section-label {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.625rem;
		font-weight: 700;
		color: hsl(var(--hsl-content) / 0.4);
		margin: 0 0 0.4rem;
	}

	.stack-surface {
		margin: 0 0 1rem;
		padding: 0.75rem 0.9rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 8px;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		line-height: 1.55;
		color: hsl(var(--hsl-content) / 0.9);
		white-space: pre;
		overflow-x: auto;
		max-height: 22rem;
		overflow-y: auto;
	}

	.occ-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.occ-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		padding: 0.2rem 0;
	}
	.occ-pod {
		color: hsl(var(--pod-hue) 55% 45%);
		font-weight: 600;
	}
	:global(.dark) .occ-pod { color: hsl(var(--pod-hue) 65% 68%); }
	.occ-time { color: hsl(var(--hsl-content) / 0.45); font-variant-numeric: tabular-nums; cursor: help; }

	.detail-error {
		font-size: 0.75rem;
		color: hsl(var(--hsl-negative));
		padding: 0.5rem 0;
	}
	.detail-loading { padding: 0.85rem 0; font-size: 0.8125rem; color: hsl(var(--hsl-content) / 0.5); }

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
		justify-content: center;
		padding: 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}

	@media (max-width: 768px) {
		.issue-row {
			grid-template-columns: [kind] 3.5rem [title] 1fr [count] auto [status] auto;
			row-gap: 0.2rem;
		}
		.issue-time { display: none; }
		.detail-meta { width: 100%; margin-left: 0; }
	}
</style>

<div class="errors-shell">
	<header class="errors-rail">
		<h6 class="errors-rail__brand">Errors</h6>
		{#if loaded && !forbidden && !unavailable && !errorMessage}
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

		<input
			class="input filter-search"
			type="search"
			placeholder="Filter issues…"
			aria-label="Filter issues"
			bind:value={query} />
	</header>

	<main class="errors-surface">
		{#if loading && !loaded}
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
				<div class="state-pane__hint">Viewing application errors requires the <code>deployment.logs</code> permission.</div>
			</div>
		{:else if unavailable}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<circle cx="12" cy="12" r="9"></circle>
					<path d="M12 8v4M12 16h.01"></path>
				</svg>
				<div class="state-pane__title">Error detection isn't available for this location yet.</div>
				<div class="state-pane__hint">This deployment's location has no log capture, so application errors can't be detected here.</div>
			</div>
		{:else if errorMessage}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<circle cx="12" cy="12" r="9"></circle>
					<path d="M12 8v4M12 16h.01"></path>
				</svg>
				<div class="state-pane__title">Couldn't load errors</div>
				<div class="state-pane__hint">{errorMessage}</div>
			</div>
		{:else if visibleIssues.length === 0}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<path d="M9 12l2 2 4-4"></path>
					<circle cx="12" cy="12" r="9"></circle>
				</svg>
				<div class="state-pane__title">
					{query.trim() ? 'No issues match your filter.' : 'No application errors detected.'}
				</div>
				{#if !query.trim()}
					<div class="state-pane__hint">Stack traces and unhandled exceptions printed by this app would show up here.</div>
				{/if}
			</div>
		{:else}
			<ul class="issue-list">
				{#each visibleIssues as issue (issue.id)}
					{@const meta = kindMeta(issue.kind)}
					<li class="issue-item" data-expanded={expandedId === issue.id}>
						<button
							type="button"
							class="issue-row"
							aria-expanded={expandedId === issue.id}
							onclick={() => toggleExpand(issue)}>
							<span class="kind-badge" style={`--kind-hue: ${meta.hue}`}>{meta.label}</span>
							<span class="issue-title">
								<span class="issue-title__text" title={issue.title}>{issue.title}</span>
								<span class="issue-title__pod" style={`--pod-hue: ${podHue(issue.samplePod)}`} title={issue.samplePod}>{issue.samplePod}</span>
							</span>
							<span class="issue-count" title={`${issue.count} occurrences`}>
								{issue.count.toLocaleString()}<span class="issue-count__unit">×</span>
							</span>
							<span class="issue-time" title={issue.lastSeen}>{relTime(issue.lastSeen, now)}</span>
							<span class="status-chip" data-status={issue.status}>{issue.status}</span>
						</button>

						{#if expandedId === issue.id}
							<div class="issue-detail">
								<div class="detail-actions">
									{#if issue.status !== 'resolved'}
										<GuardedButton
											permission={TRIAGE_PERMISSION}
											class="button is-variant-secondary is-size-small"
											loading={updatingId === issue.id}
											onclick={() => updateStatus(issue, 'resolved')}>
											Resolve
										</GuardedButton>
									{/if}
									{#if issue.status === 'open'}
										<GuardedButton
											permission={TRIAGE_PERMISSION}
											class="button is-variant-tertiary is-size-small"
											loading={updatingId === issue.id}
											onclick={() => updateStatus(issue, 'muted')}>
											Mute
										</GuardedButton>
									{/if}
									{#if issue.status !== 'open'}
										<GuardedButton
											permission={TRIAGE_PERMISSION}
											class="button is-variant-tertiary is-size-small"
											loading={updatingId === issue.id}
											onclick={() => updateStatus(issue, 'open')}>
											Reopen
										</GuardedButton>
									{/if}

									<div class="detail-meta">
										<span>kind <strong>{meta.label}</strong></span>
										<span>first seen <strong title={issue.firstSeen}>{relTime(issue.firstSeen, now)} ago</strong></span>
										<span>last seen <strong title={issue.lastSeen}>{relTime(issue.lastSeen, now)} ago</strong></span>
									</div>
								</div>

								{#if detailLoading}
									<div class="detail-loading">Loading issue…</div>
								{:else if detailError}
									<div class="detail-error">{detailError}</div>
								{:else if detail}
									<p class="detail-section-label">Sample stack trace</p>
									<pre class="stack-surface">{detail.sampleMessage}</pre>

									{#if detail.recentEvents.length > 0}
										<p class="detail-section-label">Recent occurrences</p>
										<ul class="occ-list">
											{#each detail.recentEvents as occ, i (i)}
												<li class="occ-row">
													<span class="occ-pod" style={`--pod-hue: ${podHue(occ.pod)}`} title={occ.pod}>{occ.pod}</span>
													<span class="occ-time" title={occ.timestamp}>{relTime(occ.timestamp, now)} ago</span>
												</li>
											{/each}
										</ul>
									{/if}
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>

			{#if nextCursor}
				<div class="load-more-bar">
					<button
						type="button"
						class="button is-variant-secondary is-size-small"
						class:is-loading={loadingMore}
						disabled={loadingMore}
						onclick={loadMore}>
						Load more
					</button>
				</div>
			{/if}
		{/if}
	</main>
</div>
