<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const users = $derived(data.users)
	const error = $derived(data.error)

	/**
	 * @param {string} email
	 */
	function deleteUser (email) {
		modal.confirm({
			title: `Delete user ${email} from project ${project}?`,
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

<div class="page-head">
	<div>
		<h4><strong>Users</strong></h4>
		<p class="page-sub">{users.length} {users.length === 1 ? 'user' : 'users'}</p>
	</div>
	<a class="button is-icon-left" href="/role/bind?project={project}">
		<i class="fa-solid fa-plus"></i>
		Add
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Email</th>
					<th>Roles</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each users as it (it.email)}
					<tr>
						<td>{it.email}</td>
						<td>
							{#each it.roles as r (r)}
								{r}<br>
							{/each}
						</td>
						<td>
							<a href="/role/bind?project={project}&email={it.email}" aria-label="Edit">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
							<button class="icon-button" aria-label="Remove" onclick={() => deleteUser(it.email)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={users} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>

