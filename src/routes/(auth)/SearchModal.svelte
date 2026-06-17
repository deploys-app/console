<script lang="ts">
	import type { SearchEntry } from '$lib/search'
	import { tick } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { navEntries, projectEntries, fetchResourceEntries, filterEntries } from '$lib/search'

	interface Props {
		projects?: Api.Project[]
	}

	const { projects = [] }: Props = $props()

	const project = $derived($page.url.searchParams.get('project'))

	let isActive = $state(false)
	let search = $state('')
	let elSearch = $state<HTMLInputElement | null>(null)
	let highlighted = $state(0)
	const rowEls = $state<HTMLElement[]>([])

	let loading = $state(false)
	let loadedProject = $state<string | null>(null)
	let resources = $state<SearchEntry[]>([])

	// Project entries are first so typing a project name highlights the switch
	// row before any nav/resource match (intent: "I'm trying to switch project").
	const allEntries = $derived(project
		? [...projectEntries(projects, project, $page), ...navEntries(project), ...resources]
		: [])

	// Empty query → just the nav sections (showing every resource — or every
	// project — would be a wall of rows); typing surfaces projects + nav + fetched
	// resources together.
	const base = $derived(search.trim() ? allEntries : (project ? navEntries(project) : []))
	const filtered = $derived(filterEntries(base, search))

	// Group consecutive entries by section for display while keeping the flat
	// index that drives keyboard highlighting.
	const grouped = $derived.by(() => {
		const out: { group: string, items: { entry: SearchEntry, index: number }[] }[] = []
		filtered.forEach((entry, index) => {
			let g = out.at(-1)
			if (!g || g.group !== entry.group) {
				g = { group: entry.group, items: [] }
				out.push(g)
			}
			g.items.push({ entry, index })
		})
		return out
	})

	// Keep the keyboard-highlighted row scrolled into view as it moves.
	$effect(() => {
		rowEls[highlighted]?.scrollIntoView({ block: 'nearest' })
	})

	export async function open () {
		search = ''
		highlighted = 0
		isActive = true
		await tick()
		elSearch?.focus()

		// Fetch the project's resources once per project, lazily on first open.
		if (project && loadedProject !== project) {
			loading = true
			loadedProject = project
			try {
				resources = await fetchResourceEntries(project, fetch)
			} finally {
				loading = false
			}
		}
	}

	function close () {
		isActive = false
		// Release focus so the page-level "/" shortcut can reopen the palette.
		elSearch?.blur()
	}

	function navigate (entry: SearchEntry) {
		close()
		goto(entry.href)
	}

	/**
	 * Close only when the backdrop itself is clicked, not when a click inside the
	 * panel bubbles up.
	 */
	function onBackdrop (e: MouseEvent) {
		if (e.target === e.currentTarget) close()
	}

	/**
	 * Arrow Up/Down move the highlighted row; Enter opens it; Escape closes.
	 */
	function onSearchKeydown (e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close()
			return
		}
		if (!filtered.length) return
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			highlighted = Math.min(highlighted + 1, filtered.length - 1)
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			highlighted = Math.max(highlighted - 1, 0)
		} else if (e.key === 'Enter') {
			e.preventDefault()
			navigate(filtered[highlighted])
		}
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4>Search</h4>

		<div class="input -has-icon-left mt-4">
			<span class="icon -is-left"><i class="fa-solid fa-magnifying-glass"></i></span>
			<input
				bind:this={elSearch}
				bind:value={search}
				onkeydown={onSearchKeydown}
				oninput={() => highlighted = 0}
				type="text"
				placeholder="Search projects, deployments, domains, routes…"
				autocomplete="off"
			>
		</div>

		<div class="results mt-4">
			{#if !project}
				<div class="empty">
					<i class="fa-solid fa-folder-open"></i>
					<span>Select a project to search its resources.</span>
				</div>
			{:else}
				{#each grouped as section (section.group)}
					<div class="group-label">{section.group}</div>
					{#each section.items as { entry, index } (entry.id)}
						<div
							bind:this={rowEls[index]}
							class="result"
							class:is-highlighted={index === highlighted}
							onmouseenter={() => highlighted = index}
							onclick={() => navigate(entry)}
							onkeypress={() => navigate(entry)}
							tabindex="0"
							role="link">
							<span class="result-icon"><i class="fa-solid {entry.icon}"></i></span>
							<span class="result-label">{entry.label}</span>
							{#if entry.sublabel}
								<span class="result-sublabel">{entry.sublabel}</span>
							{/if}
						</div>
					{/each}
				{/each}

				{#if !filtered.length}
					<div class="empty">
						{#if loading}
							<i class="fa-solid fa-spinner fa-spin"></i>
							<span>Loading resources…</span>
						{:else}
							<i class="fa-solid fa-magnifying-glass"></i>
							<span>No matches for “{search}”.</span>
						{/if}
					</div>
				{:else if loading}
					<div class="loading-hint">
						<i class="fa-solid fa-spinner fa-spin"></i> Loading more resources…
					</div>
				{/if}
			{/if}
		</div>

		<div class="footer-hints">
			<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
			<span><kbd>↵</kbd> open</span>
			<span><kbd>esc</kbd> close</span>
		</div>
	</div>
</div>

<style>
	.modal-panel {
		box-shadow: 0 15px 15px 0 rgba(43, 43, 43, 0.1);
		width: 100%;
		max-width: 42rem;
	}

	.results {
		max-height: 420px;
		overflow-y: auto;
	}

	.group-label {
		padding: 0.5rem 0.5rem 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content) / 0.45);
	}

	.result {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		color: hsl(var(--hsl-content) / 0.85);
	}

	.result.is-highlighted {
		background-color: hsl(var(--hsl-primary) / 0.1);
		color: hsl(var(--hsl-content));
	}

	.result-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.result.is-highlighted .result-icon {
		color: hsl(var(--hsl-primary));
	}

	.result-label {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-sublabel {
		margin-left: auto;
		padding-left: 1rem;
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 50%;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		color: hsl(var(--hsl-content) / 0.5);
		font-size: var(--fs-2);
	}

	.empty i {
		font-size: 1.5rem;
		opacity: 0.6;
	}

	.loading-hint {
		padding: 0.5rem 0.625rem;
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.5);
	}

	.footer-hints {
		display: flex;
		gap: 1rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid hsl(var(--hsl-line));
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.5);
	}

	.footer-hints kbd {
		display: inline-block;
		min-width: 1.25rem;
		margin-right: 0.125rem;
		padding: 0.0625rem 0.3125rem;
		text-align: center;
		font-family: inherit;
		font-size: 0.6875rem;
		line-height: 1.4;
		color: hsl(var(--hsl-content) / 0.7);
		background-color: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-sm);
	}
</style>
