<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { projects } from '$lib/stores'
	import { invalidate } from '$app/navigation'
	import api from '$lib/api'
	import Swal from 'sweetalert2'

	async function deleteItem (project) {
		let result = await Swal.fire({
			title: 'Are you sure ?',
			text: `Type "${project}" to confirm!`,
			icon: 'warning',
			input: 'text',
			showCancelButton: true,
			buttonsStyling: false,
			confirmButtonText: 'Delete',
			customClass: {
				confirmButton: 'moon-button _cl-white -danger _mgr-16px',
				cancelButton: 'moon-button -negative -tertiary',
				actions: '_mgt-24px'
			},
			preConfirm: (input) => input === project
		})
		if (!result.isConfirmed || !result.value) {
			return
		}

		result = await api.invoke('project.delete', { project }, fetch)
		if (!result.ok) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: result.error
				}
			}))
			return
		}
		await invalidate('projects')
	}
</script>

<h6>Projects</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href="/project/create">
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
				<tr>
					<th>Name</th>
					<th>ID</th>
					<th>Number</th>
					<th class="collapse _tal-r"></th>
				</tr>
			</thead>
			<tbody>
				{#each $projects as it}
					<tr>
						<td>
							<a href={`/?project=${it.project}`} class="moon-link">
								<strong>{it.name}</strong>
							</a>
						</td>
						<td>{it.project}</td>
						<td>{it.id}</td>
						<td class="table-action-container">
							<a href={`/project/create?project=${it.project}`}>
								<div class="moon-icon-button -secondary">
									<i class="fas fa-pen"></i>
								</div>
							</a>
							<button class="moon-icon-button -negative" on:click={() => deleteItem(it.project)}>
								<i class="fas fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span="4" />
				{/each}
			</tbody>
		</table>
	</div>
</div>
