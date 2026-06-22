<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { kindMeta, hashHue, relTime, classifyListError } from '$lib/errors/format'
	import ErrorsRail from '$lib/errors/ErrorsRail.svelte'
	import KindBadge from '$lib/errors/KindBadge.svelte'
	import StatusChip from '$lib/errors/StatusChip.svelte'
	import StatePane from '$lib/errors/StatePane.svelte'
	import LoadMoreBar from '$lib/errors/LoadMoreBar.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const deployment = $derived(data.deployment)
	// Read once: a deep-link from the project-wide Errors view that we open
	// straight to (see onMount). untrack() makes the single-read intent explicit
	// (this is a landing param, not something to react to on prop churn).
	const initialIssueId = untrack(() => data.initialIssueId)

	// Reading the issue list + detail is gated by error.list / error.get; triage
	// (resolve/mute/reopen) by error.update. Keep these in lockstep with the
	// server-side gate.
	const READ_PERMISSION = 'error.list'
	const TRIAGE_PERMISSION = 'error.update'

	// Shared logic (STATUS_FILTERS/SORT_OPTIONS/kindMeta/hashHue/relTime/
	// classifyListError) and the rail/badge/chip UI live in $lib/errors.
	type StatusFilter = Api.ErrorStatusFilter

	// Deep-linked arrivals default to "all" so the target issue is present
	// whatever its status (it may have been resolved/muted since).
	let status = $state<StatusFilter>(initialIssueId ? 'all' : 'open')
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
	let unavailable = $state(false)
	let errorMessage = $state('')
	let now = $state(Date.now())

	// Expanded issue id → its loaded detail (or null while loading).
	let expandedId = $state<string | null>(null)
	let detail = $state<Api.ErrorIssueDetail | null>(null)
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
		const c = classifyListError(resp)
		forbidden = c.kind === 'forbidden'
		unavailable = c.kind === 'unavailable'
		errorMessage = c.kind === 'error' ? c.message : ''
	}

	async function loadIssues (): Promise<void> {
		loading = true
		// Reset terminal states on each fresh load so a filter change after a
		// forbidden/unavailable response can recover.
		forbidden = false
		unavailable = false
		errorMessage = ''
		// A prior page's load-more failure must not haunt a freshly loaded list.
		loadMoreError = false
		// Collapse any open detail — the expanded issue may not exist under the
		// new filter.
		expandedId = null
		detail = null
		const resp = await api.invoke<Api.ErrorListResult>('error.list', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
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
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
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

	// Fetch and show the detail for an already-expanded issue id. Split out of
	// toggleExpand so the deep-link open and the detail "Try again" can reuse it.
	async function loadDetail (id: string): Promise<void> {
		detail = null
		detailError = ''
		detailLoading = true
		const resp = await api.invoke<Api.ErrorGetResult>('error.get', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			id
		}, fetch)
		// A different row may have been expanded while this was in flight; only
		// apply the result if it's still the active one.
		if (expandedId !== id) return
		if (resp.ok) {
			detail = resp.result.issue
		} else {
			detailError = resp.error?.message || 'Failed to load issue detail.'
		}
		detailLoading = false
	}

	async function toggleExpand (issue: Api.ErrorIssue): Promise<void> {
		if (expandedId === issue.id) {
			expandedId = null
			detail = null
			detailError = ''
			return
		}
		expandedId = issue.id
		// Move focus into the freshly-opened detail region so keyboard users land in
		// it and screen readers announce it; mouse users see no ring (:focus-visible).
		requestAnimationFrame(() => document.getElementById(`detail-${issue.id}`)?.focus())
		await loadDetail(issue.id)
	}

	function triageMessage (next: Api.ErrorStatus): string {
		if (next === 'resolved') return 'Issue resolved.'
		if (next === 'muted') return 'Issue muted.'
		if (next === 'open') return 'Issue reopened.'
		return 'Issue updated.'
	}

	async function updateStatus (issue: Api.ErrorIssue, next: Api.ErrorStatus): Promise<void> {
		updatingId = issue.id
		const resp = await api.invoke('error.update', {
			project: deployment.project,
			location: deployment.location,
			name: deployment.name,
			id: issue.id,
			status: next
		}, fetch)
		updatingId = null
		if (!resp.ok) {
			// Surface failure in a modal — the detail panel it lives in may collapse
			// or scroll away on the refetch below, hiding an inline message.
			modal.error({ error: resp.error })
			return
		}
		// Refetch the list so the issue moves to (or out of) the active filter.
		// loadIssues() collapses the open detail (the issue may now be filtered
		// out), so confirm the action in a modal since the panel closes silently.
		await loadIssues()
		modal.success({ content: triageMessage(next) })
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
		loadIssues().then(() => {
			// Deep-link: open the target issue once the list has loaded. If it isn't
			// present (paged off or gone), fall through silently — no broken expand.
			if (initialIssueId && issues.some((it) => it.id === initialIssueId)) {
				expandedId = initialIssueId
				loadDetail(initialIssueId)
				requestAnimationFrame(() =>
					document.getElementById(`issue-${initialIssueId}`)?.scrollIntoView({ block: 'nearest' }))
			}
		})
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
		color: hsl(var(--pod-hue) 55% 45%);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	:global(.dark) .issue-title__pod { color: hsl(var(--pod-hue) 65% 68%); }

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

	/* detail */
	.issue-detail {
		padding: 0 1rem 1rem;
		background: hsl(var(--hsl-content) / 0.02);
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}
	/* The panel takes focus on open only to move the reading cursor here; it's a
	   region, not a control, so suppress the ring (its buttons keep their own). */
	.issue-detail:focus { outline: none; }

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
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-negative));
		padding: 0.5rem 0;
	}
	.detail-loading { padding: 0.85rem 0; font-size: 0.8125rem; color: hsl(var(--hsl-content) / 0.5); }

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
	<ErrorsRail
		bind:status
		bind:sort
		bind:query
		count={loaded && !forbidden && !unavailable && !errorMessage ? countLabel : null}
		onRefresh={loadIssues}
		refreshing={loading} />

	<main class="errors-surface">
		{#if loading && !issues.length}
			<StatePane title="Loading errors…" />
		{:else if forbidden}
			<StatePane
				icon="lock"
				title="You don't have access to errors"
				hint={`Viewing application errors requires the ${READ_PERMISSION} permission.`} />
		{:else if unavailable}
			<StatePane
				icon="alert"
				title="Error detection isn't available for this location yet."
				hint="This deployment's location has no log capture, so application errors can't be detected here." />
		{:else if errorMessage}
			<StatePane icon="alert" title="Couldn't load errors" hint={errorMessage}>
				{#snippet action()}
					<button
						type="button"
						class="button is-variant-secondary is-size-small"
						class:is-loading={loading}
						onclick={loadIssues}>
						Try again
					</button>
				{/snippet}
			</StatePane>
		{:else if visibleIssues.length === 0}
			<StatePane
				icon="check"
				title={query.trim() ? 'No issues match your filter.' : 'No application errors detected.'}
				hint={query.trim() ? undefined : 'Stack traces and unhandled exceptions printed by this app would show up here.'} />
		{:else}
			<ul class="issue-list">
				{#each visibleIssues as issue (issue.id)}
					{@const meta = kindMeta(issue.kind)}
					<li class="issue-item" id={`issue-${issue.id}`} data-expanded={expandedId === issue.id}>
						<button
							type="button"
							class="issue-row"
							aria-expanded={expandedId === issue.id}
							aria-controls={expandedId === issue.id ? `detail-${issue.id}` : undefined}
							onclick={() => toggleExpand(issue)}>
							<KindBadge kind={issue.kind} />
							<span class="issue-title">
								<span class="issue-title__text" title={issue.title}>{issue.title}</span>
								<span class="issue-title__pod" style={`--pod-hue: ${hashHue(issue.samplePod)}`} title={issue.samplePod}>{issue.samplePod}</span>
							</span>
							<span class="issue-count" title={`${issue.count} occurrences`}>
								{issue.count.toLocaleString()}<span class="issue-count__unit">×</span>
							</span>
							<span class="issue-time" title={issue.lastSeen}>{relTime(issue.lastSeen, now)}</span>
							<StatusChip status={issue.status} />
						</button>

						{#if expandedId === issue.id}
							<div
								class="issue-detail"
								id={`detail-${issue.id}`}
								role="region"
								aria-label={`Details for ${issue.title}`}
								tabindex="-1">
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
									<div class="detail-error">
										<span>{detailError}</span>
										<button
											type="button"
											class="button is-variant-secondary is-size-small"
											onclick={() => { if (expandedId) loadDetail(expandedId) }}>
											Try again
										</button>
									</div>
								{:else if detail}
									<p class="detail-section-label">Sample stack trace</p>
									<pre class="stack-surface">{detail.sampleMessage}</pre>

									{#if detail.recentEvents.length > 0}
										<p class="detail-section-label">Recent occurrences</p>
										<ul class="occ-list">
											{#each detail.recentEvents as occ, i (i)}
												<li class="occ-row">
													<span class="occ-pod" style={`--pod-hue: ${hashHue(occ.pod)}`} title={occ.pod}>{occ.pod}</span>
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

			<LoadMoreBar {nextCursor} {query} {loadingMore} {loadMoreError} onLoadMore={loadMore} />
		{/if}
	</main>
</div>
