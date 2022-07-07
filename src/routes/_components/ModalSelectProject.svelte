<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { project } from '$lib/stores'

	let isActive
	export let projects

	function setProject (sid) {
		const q = new URLSearchParams($page.url.search)
		q.set('project', sid)

		if ($project) {
			goto(`${$page.stuff.overrideRedirect || ''}?${q.toString()}`)
			return
		}

		close()
		goto(`/?${q.toString()}`)
	}

	function close () {
		isActive = false
	}
</script>

<!-- To open and close modal either
1. use <label for="project-select-modal" /> any where to toggle checkbox state
2. set 'isActive' (which bind to checkbox state)
3. query this checkbox element then simulate click it
-->
<input class="modal-state" id="project-select-modal" type="checkbox" bind:checked={isActive}>
<div class="modal" on:click|self={close}>
	<div class="modal-panel u-raised-1">
		<div class="modal-close" on:click|self={close}>✕</div>
		<h4>Projects</h4>

		<div class="table-container">
			<table class="table -ruled _fs-300">
				<thead>
					<tr>
						<th class="collapsed"></th>
						<th>Name</th>
						<th>Id</th>
					</tr>
				</thead>
				<tbody>
					{#each projects as it}
					<tr>
						<td>
							{#if $project === it.project}
								<i class="fas fa-check _cl-primary-500 _fs-600"></i>
							{/if}
						</td>
						<td>
							<div on:click={() => setProject(it.project)} class="_tdcrt-udl _cs-pt _cl-primary-500-hover" style="font-weight: 500">
								{it.name}
							</div>
						</td>
						<td>{it.project}</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
<style lang="scss">
	.table-container {
		max-height: 405px;
		overflow: auto;
	}

	.table td {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}
</style>
