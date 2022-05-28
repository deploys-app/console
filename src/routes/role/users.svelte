<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const users = await api.invoke('role.users', { project }, fetch)
		if (!users.ok && !users.error.forbidden) {
			return {
				status: 500,
				error: `users: ${users.error.message}`
			}
		}
		return {
			stuff: {
				menu: 'role.users'
			},
			props: {
				permission: {
					users: !users.error?.forbidden
				},
				users: users.result?.items || []
			},
			dependencies: ['users']
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import { invalidate } from '$app/navigation'
	import modal from '$lib/modal'

	export let permission
	export let users

	$: project = $page.stuff.project

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
				await invalidate('users')
			}
		})
	}
</script>

<h6>Users</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/role/bind?project=${project}`}>
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
									<div class="moon-icon-button -secondary">
										<i class="fas fa-pen"></i>
									</div>
								</a>
								<button class="moon-icon-button -negative" on:click={() => deleteUser(it.email)}>
									<i class="fas fa-trash-alt"></i>
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

