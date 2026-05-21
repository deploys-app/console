<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	const { data } = $props()
	const roles = $derived(data.roles)
	const email = $derived(data.email)
	const selected = $derived(data.selected)

	const project = $derived(data.project)

	const form = $state(untrack(() => ({
		email,
		roles: selected
	})))

	function addRole (role) {
		if (!role || form.roles.includes(role)) {
			return
		}

		form.roles = [...form.roles, role]
	}

	function removeRole (role) {
		form.roles = form.roles.filter((x) => x !== role)
	}

	function selectRoleChanged (e) {
		addRole(e.target.value)
		e.target.value = ''
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/role/users?project=${project}`} class="nm-link"><h6>Users</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Add</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>Add member to "{project}" project</strong></h3>
		</div>
	</div>

	<hr>

	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="nm-field">
			<div class="nm-input">
				<input type="text" placeholder="Email / allUsers / allAuthenticatedUsers"
					bind:value={form.email} readonly={!!email} required
					list="email-suggestions"
					pattern="^(allUsers|allAuthenticatedUsers|[^@\s]+@[^@\s]+\.[^@\s]+)$">
			</div>
			<datalist id="email-suggestions">
				<option value="allUsers"></option>
				<option value="allAuthenticatedUsers"></option>
			</datalist>
		</div>
		<div class="nm-field">
			<div class="nm-select">
				<select onchange={selectRoleChanged}>
					<option value="" disabled selected>Select Role</option>
					{#each roles as it (it.role)}
						{#if !form.roles.includes(it.role)}
							<option value={it.role}>{it.name} ({it.role})</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>

		<div class="nm-table-container">
			<table class="nm-table is-variant-compact">
				<thead>
				<tr>
					<th>Role</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
				</thead>
				<tbody>
				{#each form.roles as it (it)}
					<tr>
						<td>{it}</td>
						<td>
							<div class="icon-button" role="button" tabindex="0"
								onclick={() => removeRole(it)} onkeypress={() => removeRole(it)}>
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

		<button class="nm-button mt-4 mr-auto" class:is-loading={saving}>
			Save
		</button>
	</form>
</div>
