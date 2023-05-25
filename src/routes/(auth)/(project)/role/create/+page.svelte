<script>
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	const {
		role,
		permissions
	} = data

	$: project = data.project

	const form = {
		role: role?.role ?? '',
		name: role?.name ?? '',
		permissions: role?.permissions ?? []
	}

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

	let saving = false
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
	<ul class="breadcrumb">
		<li>
			<a href={`/role?project=${project}`} class="link"><h6>Roles</h6></a>
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

<div class="panel _dp-g _g-6">
	<div class="lo-12 _g-5">
		<div class="_dp-g _g-6 _gatf-r _gatf-cl:lg _jtfct-spbtw">
			<h3><strong>
				{#if role}
					Update role "{form.role}"
				{:else}
					Create new role
				{/if}
			</strong></h3>

			{#if role}
				<div class="_dp-f">
					<button class="button -small -negative -tertiary" type="button" on:click={deleteItem}>Delete</button>
				</div>
			{/if}
		</div>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct _mxw-512px" on:submit|preventDefault={save}>
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

		<div class="_dp-g _g-6">
			<h6><strong>Permissions</strong></h6>

			<div class="field _dp-f _mgbt-5">
				<div class="select _f-1">
					<select on:change={selectPermissionChanged}>
						<option value="" disabled selected>---Select Permission---</option>
						{#each permissions.filter((x) => !form.permissions.includes(x)) as it}
							<option value={it}>{it}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="table-container">
				<table class="table -ruled">
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
									<div class="icon-button -negative"
										on:click={() => removePermission(it)} on:keypress={() => removePermission(it)}>
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

		<button class="button _mgt-6 _mgr-at" class:-loading={saving}>
			{#if role}Update{:else}Create{/if}
		</button>
	</form>
</div>
