<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: users = data.users

	function deleteUser (email) {
		modal.confirm({
			title: `Delete user ${email} from project ${project} ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('role.bind', {
					project,
					email,
					roles: []
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				api.invalidate('role.users')
			}
		})
	}
</script>

<h6>Users</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="button -small" href={`/role/bind?project=${project}`}>
				Add
			</a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
				<tr>
					<th>Email</th>
					<th>Roles</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#if $loading}
					<LoadingRow span={3} />
				{:else}
					{#each users as it}
						<tr>
							<td>{it.email}</td>
							<td>
								{#each it.roles as r}
									{r}<br>
								{/each}
							</td>
							<td>
								<a href={`/role/bind?project=${project}&email=${it.email}`}>
									<div class="icon-button">
										<i class="fa-solid fa-pen"></i>
									</div>
								</a>
								<button class="icon-button" on:click={() => deleteUser(it.email)}>
									<i class="fa-solid fa-trash-alt"></i>
								</button>
							</td>
						</tr>
					{:else}
						<NoDataRow span={3} forbidden={!permission.users} />
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

