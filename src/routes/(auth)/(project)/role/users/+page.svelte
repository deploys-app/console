<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	let project
	$: project = data.project

	let permission
	$: permission = data.permission

	let users
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
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href={`/role/bind?project=${project}`}>
				Add
			</a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
			<thead>
				<tr>
					<th>Email</th>
					<th>Roles</th>
					<th class="collapse _tal-r"></th>
				</tr>
			</thead>
			<tbody>
				{#if $loading}
					<LoadingRow span="3" />
				{:else}
					{#each users as it}
						<tr>
							<td>{it.email}</td>
							<td>
								{#each it.roles as r}
									{r}<br>
								{/each}
							</td>
							<td class="table-action-container">
								<a href={`/role/bind?project=${project}&email=${it.email}`}>
									<div class="icon-button -secondary">
										<i class="fa-solid fa-pen"></i>
									</div>
								</a>
								<button class="icon-button -negative" on:click={() => deleteUser(it.email)}>
									<i class="fa-solid fa-trash-alt"></i>
								</button>
							</td>
						</tr>
					{:else}
						<NoDataRow span="3" forbidden={!permission.users} />
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

