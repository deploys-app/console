<script lang="ts">
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import { hashHue, relTime, classifyListError } from '$lib/errors/format'
	import ErrorsRail from '$lib/errors/ErrorsRail.svelte'
	import KindBadge from '$lib/errors/KindBadge.svelte'
	import StatusChip from '$lib/errors/StatusChip.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const project = $derived(data.project)

	// Reading errors is gated by the error.list permission, matching the
	// per-deployment Errors tab (keep in lockstep with the server).
	const READ_PERMISSION = 'error.list'

	// Shared logic (STATUS_FILTERS/SORT_OPTIONS/kindMeta/hashHue/relTime/
	// classifyListError) and the rail/badge/chip UI live in $lib/errors.
	type StatusFilter = Api.ErrorStatusFilter

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
	let unavailable = $state(false)
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
	<ErrorsRail
		bind:status
		bind:sort
		bind:query
		count={loaded && !forbidden && !unavailable && !errorMessage ? countLabel : null} />

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
		{:else if unavailable}
			<div class="state-pane">
				<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					<circle cx="12" cy="12" r="9"></circle>
					<path d="M12 8v4M12 16h.01"></path>
				</svg>
				<div class="state-pane__title">Error detection isn't available yet.</div>
				<div class="state-pane__hint">No location in this project has log capture, so application errors can't be detected.</div>
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
					<li class="issue-item">
						<a class="issue-row" href={issueHref(issue)}>
							<KindBadge kind={issue.kind} />
							<span class="issue-deployment" style={`--name-hue: ${hashHue(issue.deployment)}`}>
								<span class="issue-deployment__name" title={issue.deployment}>{issue.deployment}</span>
								<span class="issue-deployment__loc" title={issue.location}>{issue.location}</span>
							</span>
							<span class="issue-title">
								<span class="issue-title__text" title={issue.title}>{issue.title}</span>
								<span class="issue-title__pod" style={`--pod-hue: ${hashHue(issue.samplePod)}`} title={issue.samplePod}>{issue.samplePod}</span>
							</span>
							<span class="issue-count" title={`${issue.count} occurrences`}>
								{issue.count.toLocaleString()}<span class="issue-count__unit">×</span>
							</span>
							<span class="issue-time" title={issue.lastSeen}>{relTime(issue.lastSeen, now)}</span>
							<StatusChip status={issue.status} />
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
