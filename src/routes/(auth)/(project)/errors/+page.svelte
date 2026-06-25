<script lang="ts">
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import { hashHue, relTime, classifyListError } from '$lib/errors/format'
	import ErrorsRail from '$lib/errors/ErrorsRail.svelte'
	import KindBadge from '$lib/errors/KindBadge.svelte'
	import StatusChip from '$lib/errors/StatusChip.svelte'
	import StatePane from '$lib/errors/StatePane.svelte'
	import LoadMoreBar from '$lib/errors/LoadMoreBar.svelte'
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

	// Seed the first page from the server-side load (+page.ts) so the list is
	// present on first paint. The status/sort defaults below MUST match
	// INITIAL_STATUS/INITIAL_SORT in +page.ts, so the seeded view matches what
	// the load fetched. This is an intentional one-time seed.
	// svelte-ignore state_referenced_locally
	const initial = data.initial
	const initialError = initial.ok ? null : classifyListError(initial)

	let status = $state<StatusFilter>('open')
	let sort = $state<Api.ErrorSort>('lastSeen')
	let query = $state('')
	let issues = $state<Api.ErrorIssue[]>(initial.ok ? initial.result.issues ?? [] : [])
	let nextCursor = $state<string | undefined>(initial.ok ? (initial.result.nextCursor || undefined) : undefined)
	let loading = $state(false)
	let loadingMore = $state(false)
	let loadMoreError = $state(false)
	// Distinguish "no data yet" from the various terminal states so we never flash
	// the empty state before the first fetch resolves. Seeded true since the
	// initial fetch already resolved server-side.
	let loaded = $state(true)
	let forbidden = $state(initialError?.kind === 'forbidden')
	let unavailable = $state(initialError?.kind === 'unavailable')
	let errorMessage = $state(initialError?.kind === 'error' ? initialError.message : '')
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
		const ticker = setInterval(() => { now = Date.now() }, 1000)
		return () => clearInterval(ticker)
	})

	// Reload whenever the project, status filter, or sort changes. `project` MUST
	// be in the key: a project switch navigates to /errors via goto
	// (overrideRedirect) WITHOUT remounting this page, so an unkeyed effect would
	// strand the previous project's issues in the list.
	//
	// trackedListKey is primed with the seeded view (current project + the
	// INITIAL_STATUS/INITIAL_SORT defaults), so the effect's first run is a no-op
	// instead of re-fetching what the server already returned. Reading the three
	// values here is what subscribes the effect to them.
	// svelte-ignore state_referenced_locally
	let trackedListKey = $state<string>(`${data.project} ${status} ${sort}`)
	$effect(() => {
		const key = `${project} ${status} ${sort}`
		if (trackedListKey === key) return
		trackedListKey = key
		loadIssues()
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
				title="Error detection isn't available yet."
				hint="No location in this project has log capture, so application errors can't be detected." />
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
				title={query.trim() ? 'No issues match your filter.' : 'No application errors across this project.'}
				hint={query.trim() ? undefined : 'Stack traces and unhandled exceptions printed by your apps would show up here.'} />
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

			<LoadMoreBar {nextCursor} {query} {loadingMore} {loadMoreError} onLoadMore={loadMore} />
		{/if}
	</main>
</div>
