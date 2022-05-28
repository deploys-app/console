<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const email = url.searchParams.get('email')

		const roles = await api.invoke('role.list', { project }, fetch)
		if (!roles.ok) {
			return {
				status: 500,
				error: `roles: ${roles.error.message}`
			}
		}

		let selected
		if (email) {
			const users = await api.invoke('role.users', { project }, fetch)
			if (!users.ok) {
				return {
					status: 500,
					error: `users: ${users.error.message}`
				}
			}

			selected = (users.result.items || []).find((x) => x.email === email)?.roles
		}

		return {
			stuff: {
				menu: 'role.users'
			},
			props: {
				email,
				roles: roles.result.items || [],
				selected: selected || []
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	export let roles
	export let email
	export let selected

	$: project = $page.stuff.project

	let form = {
		email,
		roles: selected
	}

	function addRole (role) {
		if (!role || form.roles.includes(role)) {
			return
		}

		form.roles = [...form.roles, role]
	}

	let saving

	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('role.bind', {
				project,
				email: form.email,
				roles: form.roles
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/role/users?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/role/users?project=${project}`} class="moon-link"><h6>Users</h6></a>
		</li>
		<li>
			<h6>Add</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Add member to "{project}" project</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<div class="moon-input">
				<input type="email" placeholder="Email" bind:value={form.email} readonly={!!email}>
			</div>
		</div>
		<div class="moon-field _mgbt-20px">
			<div class="moon-select">
				<select on:change={(e) => { addRole(e.target.value); e.target.value = '' }}>
					<option value="" disabled selected>---Select Role---</option>
					{#each roles as it}
						{#if !form.roles.includes(it.role)}
							<option value={it.role}>{it.name} ({it.role})</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>

		<div class="table-responsive _mgbt-50px">
			<table class="moon-table table-sm">
				<thead>
				<tr>
					<th>Role</th>
					<th></th>
				</tr>
				</thead>
				<tbody>
				{#each form.roles as it}
					<tr>
						<td>{it}</td>
						<td>
							<button type="button" class="js-delete-role moon-button -danger -small"
								on:click={() => form.roles = form.roles.filter((x) => x !== it)}>
								Delete
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="_tal-ct _cl-text-mute" colspan="2">No data</td>
					</tr>
				{/each}
				</tbody>
			</table>
		</div>
		<button class="moon-button -success" class:-loading={saving}>Save</button>
	</form>
</div>
