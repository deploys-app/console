<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import Select from '$lib/components/Select.svelte'

	const { data } = $props()
	const roles = $derived(data.roles)
	const email = $derived(data.email)
	const selected = $derived(data.selected)

	const project = $derived(data.project)

	// allUsers / allAuthenticatedUsers are valid principals alongside a normal
	// email. The editable Select has no native pattern, so validate on submit.
	const EMAIL_RE = /^(allUsers|allAuthenticatedUsers|[^@\s]+@[^@\s]+\.[^@\s]+)$/

	const form = $state(untrack(() => ({
		email: email ?? '',
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

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

		if (saving) {
			return
		}

		form.email = (form.email ?? '').trim()
		if (!EMAIL_RE.test(form.email)) {
			modal.error({ error: 'Enter a valid email address, or use allUsers / allAuthenticatedUsers.' })
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/role/users?project=${project}`} class="link"><h6>Users</h6></a>
	</div>
	{#if email}
		<div class="breadcrumb-item min-w-0">
			<h6 class="min-w-0 wrap-anywhere">{email}</h6>
		</div>
		<div class="breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="breadcrumb-item">
			<h6>Add</h6>
		</div>
	{/if}
</div>

<br>
<div class="page-head">
	<div>
		<h4><strong>{#if email}Edit member{:else}Add member{/if}</strong></h4>
		<p class="page-sub">
			{#if email}
				Change the roles assigned to this member.
			{:else}
				Grant a user or group roles in <span class="font-mono">{project}</span>.
			{/if}
		</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-email">Email</label>
			{#if email}
				<div class="input">
					<input id="input-email" value={form.email} readonly>
				</div>
			{:else}
				<Select
					id="input-email"
					editable
					bind:value={form.email}
					placeholder="Email / allUsers / allAuthenticatedUsers"
					options={[
						{ value: 'allUsers', label: 'allUsers' },
						{ value: 'allAuthenticatedUsers', label: 'allAuthenticatedUsers' }
					]} />
			{/if}
		</div>
		<div class="field">
			<label for="input-role">Role</label>
			<Select
				id="input-role"
				placeholder="Select Role"
				resetOnSelect
				onchange={(v) => addRole(String(v))}
				options={roles.filter((it) => !form.roles.includes(it.role)).map((it) => ({ value: it.role, label: `${it.name} (${it.role})` }))} />
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
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

		<GuardedButton permission="role.bind" type="submit" class="button mt-4 mr-auto" loading={saving}>
			Save
		</GuardedButton>
	</form>
</div>
