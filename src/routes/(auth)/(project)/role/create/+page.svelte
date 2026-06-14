<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import OptionSelect from '$lib/components/OptionSelect.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()
	const role = $derived(data.role)
	const permissions = $derived(data.permissions)

	const project = $derived(data.project)

	const form = $state(untrack(() => ({
		role: role?.role ?? '',
		name: role?.name ?? '',
		permissions: role?.permissions ?? []
	})))

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
			<a href={`/role/detail?project=${project}&role=${encodeURIComponent(role.role)}`} class="link"><h6>{role.role}</h6></a>
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

<div class="page-head">
	<div>
		<h4><strong>{#if role}Edit role{:else}Create role{/if}</strong></h4>
		<p class="page-sub">A named set of permissions you can assign to members.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
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
				<OptionSelect
					id="input-permission"
					placeholder="Search permissions"
					emptyText="No matching permission"
					resetOnSelect
					onchange={(v) => addPermission(String(v))}
					options={permissions.filter((x) => !form.permissions.includes(x)).map((it) => ({ value: it, label: it }))} />
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
			<GuardedButton permission="role.create" type="submit" class="button" loading={saving}>
				{#if role}Update{:else}Create{/if}
			</GuardedButton>
		</div>
	</form>
</div>
