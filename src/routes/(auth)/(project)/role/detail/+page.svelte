<script lang="ts">
	import type { PageData } from './$types'
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const role = $derived(data.role)
	const members = $derived(data.members)
	const membersError = $derived(data.membersError)

	// The built-in `owner` role is fixed — it can't be edited or deleted.
	const canUpdate = $derived(role.role !== 'owner')

	const { can } = getPermissionContext()
	$effect(() => {
		if (!canUpdate || !can('role.create')) return
		return registerPageActions([{
			id: 'role-detail:edit',
			label: 'Edit',
			icon: 'fa-pen',
			keywords: 'edit modify update role permissions',
			href: `/role/create?project=${project}&role=${encodeURIComponent(role.role)}`
		}])
	})

	function deleteItem () {
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
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/role?project=${project}`} class="link"><h6>Roles</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{role.role}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{role.role}</strong></h4>
		<p class="page-sub">{role.name}</p>
	</div>
	{#if canUpdate}
		<GuardedButton permission="role.create"
			class="button is-variant-secondary is-icon-left"
			href={`/role/create?project=${project}&role=${encodeURIComponent(role.role)}`}>
			<i class="fa-solid fa-pen"></i>
			Edit
		</GuardedButton>
	{/if}
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="input-role">Role ID</label>
			<div class="input">
				<input id="input-role" class="font-mono" value={role.role} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" value={role.name} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_at">Created at</label>
			<div class="input">
				<input id="input-created_at" value={format.datetime(role.createdAt)} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created by</label>
			<div class="input">
				<input id="input-created_by" value={role.createdBy} readonly disabled>
			</div>
		</div>

		<hr>

		<div>
			<h6><strong>Permissions</strong></h6>
			<p class="text-content/50 text-sm mt-1">
				What this role is allowed to do —
				{role.permissions.length} {role.permissions.length === 1 ? 'permission' : 'permissions'}.
			</p>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr><th>Permission</th></tr>
				</thead>
				<tbody>
					{#each role.permissions as p (p)}
						<tr><td><span class="font-mono text-sm">{p}</span></td></tr>
					{:else}
						<tr>
							<td class="text-center text-content/50">This role has no permissions.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<hr>

		<div>
			<h6><strong>Members</strong></h6>
			<p class="text-content/50 text-sm mt-1">Users assigned this role.</p>
		</div>

		{#if membersError?.forbidden}
			<p class="text-content/60 text-sm">
				<i class="fa-solid fa-lock mr-2"></i>
				You don't have permission to view members.
			</p>
		{:else}
			<div class="table-container">
				<table class="table is-variant-compact">
					<thead>
						<tr>
							<th>Email</th>
							<th>Other roles</th>
						</tr>
					</thead>
					<tbody>
						{#each members as m (m.email)}
							{@const other = m.roles.filter((r) => r !== role.role)}
							<tr>
								<td>{m.email}</td>
								<td>
									{#if other.length}
										<span class="font-mono text-sm text-content/70">{other.join(', ')}</span>
									{:else}
										<span class="text-content/40">—</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="2" class="text-center text-content/50">No users have this role.</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if canUpdate}
			<DangerZone description="Permanently delete this role. Members assigned only this role will lose their access.">
				<GuardedButton permission="role.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
			</DangerZone>
		{/if}
	</div>
</div>
