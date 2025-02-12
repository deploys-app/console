<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import api from '$lib/api'
	import Swal from 'sweetalert2'
	import * as modal from '$lib/modal'

	const { data } = $props()

	const projects = $derived(data.projects)

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
			background: 'var(--modal-panel-background)',
			color: 'var(--modal-panel-color)',
			confirmButtonText: 'Delete',
			customClass: {
				confirmButton: 'nm-button is-variant-negative _mgr-6',
				cancelButton: 'nm-button is-variant-tertiary',
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
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button -small" href="/project/create">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
				<tr>
					<th>Name</th>
					<th>ID</th>
					<th>Number</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each projects as it (it.project)}
					<tr>
						<td>
							<a href={`/?project=${it.project}`} class="nm-link">
								<strong>{it.name}</strong>
							</a>
						</td>
						<td>{it.project}</td>
						<td>{it.id}</td>
						<td>
							<a href={`/project/create?project=${it.project}`} aria-label="Edit">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
							<button class="icon-button" aria-label="Remove" onclick={() => deleteItem(it.project)}>
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
