<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const roleId = url.searchParams.get('role')

		const permissions = await api.invoke('role.permissions', {}, fetch)
		if (!permissions.ok) {
			return {
				status: 500,
				error: `permissions: ${permissions.error.message}`
			}
		}

		let role
		if (roleId) {
			const roleInfo = await api.invoke('role.get', { project, role: roleId }, fetch)
			if (!roleInfo.ok) {
				return {
					status: 500,
					error: `role: ${roleInfo.error.message}`
				}
			}
			role = roleInfo.result
		}

		return {
			stuff: {
				menu: 'role'
			},
			props: {
				role,
				permissions: permissions.result || []
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import NoDataRow from '../../lib/components/NoDataRow.svelte'
	import modal from '$lib/modal'

	export let role
	export let permissions

	const form = {
		role: role?.role || '',
		name: role?.name || '',
		permissions: role?.permissions || []
	}

	$: project = $page.stuff.project

	function deleteItem () {
		modal.confirm({
			title: `Delete ${role.role} and its users ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('role.delete', { project, role: role.role }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/role?project=${project}`)
			}
		})
	}

	function addPermission (permission) {
		if (!permission || form.permissions.includes(permission)) {
			return
		}
		form.permissions = [
			...form.permissions,
			permission
		]
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('role.create', {
				project,
				...form
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/role?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/role?project=${project}`} class="moon-link"><h6>Roles</h6></a>
		</li>
		{#if role}
			<li>
				<h6>{role.role}</h6>
			</li>
			<li>
				<h6>Update</h6>
			</li>
		{:else}
			<li>
				<h6>Create</h6>
			</li>
		{/if}
	</ul>
</div>
<br>

<div class="moon-panel _dp-g _gg-16px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3><strong>
				{#if role}
					Update role "{form.role}"
				{:else}
					Create new role
				{/if}
			</strong></h3>

			{#if role}
				<div class="_dp-f">
					<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>Delete</button>
				</div>
			{/if}
		</div>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<label for="input-role">Role ID</label>
			<div class="moon-input">
				<input id="input-role" bind:value={form.role} placeholder="Role" required readonly={!!role}>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" bind:value={form.name} placeholder="Role name" required>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<div class="_dp-g _gg-16px">
			<h6><strong>Permissions</strong></h6>

			<div class="moon-field _dp-f _mgbt-12px">
				<div class="moon-select _f-1">
					<select on:change={(e) => { addPermission(e.target.value); e.target.value = '' }}>
						<option value="" disabled selected>---Select Permission---</option>
						{#each permissions.filter((x) => !form.permissions.includes(x)) as it}
							<option value={it}>{it}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="moon-table-container">
				<table class="moon-table -ruled">
					<thead>
						<tr>
							<th>Permission</th>
							<th class="collapsed _tal-r"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.permissions as it}
							<tr>
								<td>{it}</td>
								<td class="table-action-container">
									<div class="moon-icon-button -negative"
										on:click={() => { form.permissions = form.permissions.filter((x) => x !== it) }}>
										<i class="fa-solid fa-trash-alt"></i>
									</div>
								</td>
							</tr>
						{:else}
							<NoDataRow span="2" />
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<hr>

		<button class="moon-button _mgt-16px _mgr-at" class:-loading={saving}>
			{#if role}Update{:else}Create{/if}
		</button>
	</form>
</div>
