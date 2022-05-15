<script>
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'

	let list = null

	project.subscribe(async () => {
		const result = await api.role.list({ project: $project })
		list = result.roles
	})

	function roleCanUpdate (sid) {
		return sid !== 'owner'
	}
</script>

<h6>Roles</h6>

<br>

<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/role/create?project=${$project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Role</th>
				<th>Name</th>
				<th>Created At</th>
				<th>Created By</th>
				<th class="collapsed _tal-r"></th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<td colspan="5" class="_tal-ct">
					Loading...
				</td>
			{:else}
				{#each list as it}
					<tr>
						<td>
							{#if roleCanUpdate(it.role)}
								<a href={`/role/create?project=${$project}&role=${it.role}`} class="moon-link">
									<strong>{it.role}</strong>
								</a>
							{:else}
								<strong>{it.role}</strong>
							{/if}
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
						<td>
							<div class="table-action-container">
								{#if roleCanUpdate(it.role)}
									<a href={`/role/create?project=${$project}&role=${it.role}`}>
										<div class="moon-icon-button -secondary">
											<i class="fas fa-pen"></i>
										</div>
									</a>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<td colspan="5" class="_tal-ct">
						No data
					</td>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
