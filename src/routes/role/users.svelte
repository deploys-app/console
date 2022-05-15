<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import { project } from '$lib/stores'
	import api from '$lib/api'

	let list = null

	project.subscribe(async () => {
		const result = await api.role.users({ project: $project })
		list = result.users
	})
</script>

<h6>Users</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/role/bind?project=${$project}`}>
				Add
			</a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table">
			<thead>
			<tr>
				<th>Email</th>
				<th>Roles</th>
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<LoadingRow span="3" />
			{:else}
				{#each list as it}
					<tr>
						<td>{it.email}</td>
						<td>
							{#each it.roles as r}
								{r}<br>
							{/each}
						</td>
						<td>
							<a href={`role/bind?project=${$project}&email=${it.email}`}>
								<div class="moon-icon-button -secondary">
									<i class="fas fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>

