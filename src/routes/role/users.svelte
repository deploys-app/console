<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const users = await api.invoke('role.users', { project }, fetch)
		if (!users.ok) {
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
				users: users.result.users || []
			},
			dependencies: ['users']
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import { invalidate } from '$app/navigation'

	export let users

	$: project = $page.stuff.project

	function deleteUser (email) {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete user ${email} from project ${project} ?`,
				yes: 'Delete',
				callback: async () => {
					const result = await api.invoke('role.bind', {
						project,
						email,
						roles: []
					}, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await invalidate('users')
				}
			}
		}))
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
				<th></th>
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
						<td>
							<a href={`/role/bind?project=${project}&email=${it.email}`}>
								<div class="moon-icon-button -secondary">
									<i class="fas fa-pen"></i>
								</div>
							</a>
							<button class="moon-icon-button -negative _mgl-16px" on:click={() => deleteUser(it.email)}>
								<i class="fas fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>

