<script>
	import { tick } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Project[]} projects
	 */

	/** @type {Props} */
	const { projects } = $props()

	const project = $derived($page.url.searchParams.get('project'))
	let isActive = $state(false)
	let search = $state('')
	let elSearch = $state(/** @type {?HTMLInputElement} */ (null))
	let highlighted = $state(0)
	const rowEls = $state(/** @type {HTMLElement[]} */ ([]))

	const filtered = $derived.by(() => {
		const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
		if (!tokens.length) return projects
		return projects.filter((it) => {
			const haystack = `${it.name} ${it.project}`.toLowerCase()
			return tokens.every((t) => haystack.includes(t))
		})
	})

	// Keep the keyboard-highlighted row scrolled into view as it moves.
	$effect(() => {
		rowEls[highlighted]?.scrollIntoView({ block: 'nearest' })
	})

	/**
	 * @param {string} sid
	 */
	function setProject (sid) {
		close()

		const q = new SvelteURLSearchParams($page.url.search)
		q.set('project', sid)

		if (project) {
			goto(`${$page.data.overrideRedirect || ''}?${q.toString()}`)
			return
		}

		goto(`/?${q.toString()}`)
	}

	export async function open () {
		search = ''
		highlighted = 0
		isActive = true
		await tick()
		elSearch?.focus()
	}

	function close () {
		isActive = false
	}

	/**
	 * Close only when the backdrop itself is clicked, not when a click inside
	 * the panel bubbles up — otherwise interacting with the search would dismiss
	 * the modal.
	 * @param {MouseEvent} e
	 */
	function onBackdrop (e) {
		if (e.target === e.currentTarget) close()
	}

	/**
	 * Arrow Up/Down move the highlighted row; Enter selects it.
	 * @param {KeyboardEvent} e
	 */
	function onSearchKeydown (e) {
		if (!filtered.length) return
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			highlighted = Math.min(highlighted + 1, filtered.length - 1)
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			highlighted = Math.max(highlighted - 1, 0)
		} else if (e.key === 'Enter') {
			setProject(filtered[highlighted].project)
		}
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4>Projects</h4>

		<div class="input -has-icon-left mt-4">
			<span class="icon -is-left"><i class="fa-solid fa-magnifying-glass"></i></span>
			<input
				bind:this={elSearch}
				bind:value={search}
				onkeydown={onSearchKeydown}
				oninput={() => highlighted = 0}
				type="text"
				placeholder="Search projects…"
				autocomplete="off"
			>
		</div>

		<div class="table-container mt-4">
			<table class="table is-variant-compact" style="--table-data-font-size: var(--fs-2)">
				<thead>
					<tr>
						<th class="is-collapse"></th>
						<th>Name</th>
						<th>ID</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as it, i (it.project)}
					<tr bind:this={rowEls[i]} class:is-highlighted={i === highlighted} onmouseenter={() => highlighted = i}>
						<td>
							{#if project === it.project}
								<i class="fas fa-check text-primary text-xl"></i>
							{/if}
						</td>
						<td>
							<div onclick={() => setProject(it.project)} onkeypress={() => setProject(it.project)}
								tabindex="0" role="link"
								class="underline cursor-pointer hover:text-primary"
								style="font-weight: 500">
								{it.name}
							</div>
						</td>
						<td>{it.project}</td>
					</tr>
					{/each}
					<NoDataRow span={3} list={filtered} icon="fa-magnifying-glass" message="No projects match your search" />
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.table-container {
		max-height: 405px;
		overflow: auto;
	}

	.table td {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.table tbody tr.is-highlighted td {
		background-color: hsl(var(--hsl-primary) / 0.1);
	}

	.modal-panel {
		box-shadow: 0 15px 15px 0 rgba(43, 43, 43, 0.1);
		width: 100%;
		max-width: 48rem;
	}
</style>
