<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import api from '$lib/api'
	import Swal from 'sweetalert2'
	import * as modal from '$lib/modal'

	export let data

	$: projects = data.projects

	/**
	 * @param {string} project
	 * @returns {Promise<void>}
	 */
	async function deleteItem (project) {
		const result = await Swal.fire({
			title: 'Are you sure ?',
			text: `Type "${project}" to confirm!`,
			icon: 'warning',
			input: 'text',
			showCancelButton: true,
			buttonsStyling: false,
			confirmButtonText: 'Delete',
			customClass: {
				confirmButton: 'button _cl-white -danger _mgr-6',
				cancelButton: 'button -negative -tertiary',
				actions: '_mgt-7'
			},
			preConfirm: (input) => input === project
		})
		if (!result.isConfirmed || !result.value) {
			return
		}

		const resp = await api.invoke('project.delete', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		await api.invalidate('project.list')
	}
</script>

<h6>Projects</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="button -small" href="/project/create">
                Create
            </a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
			<thead>
				<tr>
					<th>Name</th>
					<th>ID</th>
					<th>Number</th>
					<th class="collapse _tal-r"></th>
				</tr>
			</thead>
			<tbody>
				{#each projects as it}
					<tr>
						<td>
							<a href={`/?project=${it.project}`} class="link">
								<strong>{it.name}</strong>
							</a>
						</td>
						<td>{it.project}</td>
						<td>{it.id}</td>
						<td class="table-action-container">
							<a href={`/project/create?project=${it.project}`}>
								<div class="icon-button -secondary">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
							<button class="icon-button -negative" on:click={() => deleteItem(it.project)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span={4} />
				{/each}
			</tbody>
		</table>
	</div>
</div>
