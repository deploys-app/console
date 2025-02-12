<script>
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const {
		role,
		permissions
	} = data

	const project = $derived(data.project)

	const form = $state({
		role: role?.role ?? '',
		name: role?.name ?? '',
		permissions: role?.permissions ?? []
	})

	function deleteItem () {
		if (!role) return

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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/role?project=${project}`} class="nm-link"><h6>Roles</h6></a>
	</div>
	{#if role}
		<div class="nm-breadcrumb-item">
			<h6>{role.role}</h6>
		</div>
		<div class="nm-breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="nm-breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-6">
	<div class="lo-12 _g-5">
		<h3><strong>
			{#if role}
				Update role "{form.role}"
			{:else}
				Create new role
			{/if}
		</strong></h3>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-role">Role ID</label>
			<div class="nm-input">
				<input id="input-role" bind:value={form.role} placeholder="Role" required readonly={!!role}>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" bind:value={form.name} placeholder="Role name" required>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<div class="_dp-g _g-6">
			<h6><strong>Permissions</strong></h6>

			<div class="nm-field _dp-f _mgbt-5">
				<div class="nm-select">
					<select onchange={selectPermissionChanged}>
						<option value="" disabled selected>---Select Permission---</option>
						{#each permissions.filter((x) => !form.permissions.includes(x)) as it}
							<option value={it}>{it}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="nm-table-container">
				<table class="nm-table is-variant-compact">
					<thead>
						<tr>
							<th>Permission</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.permissions as it}
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

		<div class="_dp-f _g-6">
			<button class="nm-button" class:is-loading={saving}>
				{#if role}Update{:else}Create{/if}
			</button>
			{#if role}
				<button class="nm-button" type="button" onclick={deleteItem}>Delete</button>
			{/if}
			</div>
	</form>
</div>
