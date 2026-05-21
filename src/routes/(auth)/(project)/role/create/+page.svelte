<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const role = $derived(data.role)
	const permissions = $derived(data.permissions)

	const project = $derived(data.project)

	const form = $state(untrack(() => ({
		role: role?.role ?? '',
		name: role?.name ?? '',
		permissions: role?.permissions ?? []
	})))

	function deleteItem () {
		if (!role) return

		modal.confirm({
			title: `Delete ${role.role} and its users?`,
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

	/**
	 * @param {string} permission
	*/
	function addPermission (permission) {
		if (!permission || form.permissions.includes(permission)) {
			return
		}
		form.permissions = [
			...form.permissions,
			permission
		]
	}

	function selectPermissionChanged (e) {
		addPermission(e.target.value)
		e.target.value = ''
	}

	function removePermission (permission) {
		form.permissions = form.permissions.filter((x) => x !== permission)
	}

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/role?project=${project}`} class="link"><h6>Roles</h6></a>
	</div>
	{#if role}
		<div class="breadcrumb-item">
			<h6>{role.role}</h6>
		</div>
		<div class="breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="panel is-level-300 grid gap-4">
	<div class="grid grid-cols-1 gap-3">
		<h3><strong>
			{#if role}
				Update role "{form.role}"
			{:else}
				Create new role
			{/if}
		</strong></h3>
	</div>

	<hr>

	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-role">Role ID</label>
			<div class="input">
				<input id="input-role" bind:value={form.role} placeholder="Role" required readonly={!!role}>
			</div>
		</div>

		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" bind:value={form.name} placeholder="Role name" required>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<div class="grid gap-4">
			<h6><strong>Permissions</strong></h6>

			<div class="field flex mb-3">
				<div class="select">
					<select onchange={selectPermissionChanged}>
						<option value="" disabled selected>Select Permission</option>
						{#each permissions.filter((x) => !form.permissions.includes(x)) as it (it)}
							<option value={it}>{it}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="table-container">
				<table class="table is-variant-compact">
					<thead>
						<tr>
							<th>Permission</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.permissions as it (it)}
							<tr>
								<td>{it}</td>
								<td>
									<div class="icon-button" role="button" tabindex="0"
										onclick={() => removePermission(it)} onkeypress={() => removePermission(it)}>
										<i class="fa-solid fa-trash-alt"></i>
									</div>
								</td>
							</tr>
						{:else}
							<NoDataRow span={2} />
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<hr>

		<div class="flex gap-4">
			<button class="button" class:is-loading={saving}>
				{#if role}Update{:else}Create{/if}
			</button>
			{#if role}
				<button class="button" type="button" onclick={deleteItem}>Delete</button>
			{/if}
			</div>
	</form>
</div>
