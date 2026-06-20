<script lang="ts">
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'
	import gravatarUrl from 'gravatar-url'

	const { data }: { data: PageData } = $props()

	const { can } = getPermissionContext()

	const project = $derived(data.project)
	const users = $derived(data.users)
	const error = $derived(data.error)
	const myEmail = $derived(data.profile?.email ?? '')

	function deleteUser (email: string) {
		modal.confirm({
			title: `Delete user ${email} from project ${project}?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('role.bind', {
					project,
					email,
					roles: []
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				api.invalidate('role.users')
			}
		})
	}
</script>

<style>
	.user-cell {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-width: 0;
	}

	.avatar {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: hsl(var(--hsl-content) / 0.06);
		object-fit: cover;
	}

	.user-id {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.user-email {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
		overflow-wrap: anywhere;
	}

	.you-tag {
		flex-shrink: 0;
		padding: 0.05rem 0.4rem;
		border-radius: 5px;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
	}

	.role-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.role-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.5rem;
		border-radius: 5px;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--ffml-mono);
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.8);
	}
	.role-chip i { font-size: 0.62rem; opacity: 0.6; }

	.no-roles {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.45);
		font-style: italic;
	}
</style>

<div class="page-head">
	<div>
		<h4><strong>Users</strong></h4>
		<p class="page-sub">{users.length} {users.length === 1 ? 'user' : 'users'}</p>
	</div>
	<GuardedButton permission="role.bind" class="button is-icon-left" href="/role/bind?project={project}">
		<i class="fa-solid fa-plus"></i>
		Add
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>User</th>
					<th>Roles</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each users as it (it.email)}
					<tr>
						<td>
							<div class="user-cell">
								<img class="avatar" src={gravatarUrl(it.email, { default: 'mp' })} alt="" width="32" height="32" crossorigin="anonymous" draggable="false">
								<div class="user-id">
									<span class="user-email">
										{it.email}
										{#if it.email === myEmail}
											<span class="you-tag">You</span>
										{/if}
									</span>
								</div>
							</div>
						</td>
						<td>
							{#if it.roles.length > 0}
								<div class="role-chips">
									{#each it.roles as r (r)}
										<span class="role-chip"><i class="fa-solid fa-user-shield"></i>{r}</span>
									{/each}
								</div>
							{:else}
								<span class="no-roles">No roles</span>
							{/if}
						</td>
						<td>
							{#if can('role.bind')}
								<a href="/role/bind?project={project}&email={it.email}" aria-label="Edit">
									<div class="icon-button">
										<i class="fa-solid fa-pen"></i>
									</div>
								</a>
							{:else}
								<span class="inline-flex" title={denyTooltip('role.bind')}>
									<button class="icon-button" type="button" aria-label="Edit" disabled aria-disabled="true">
										<i class="fa-solid fa-pen"></i>
									</button>
								</span>
							{/if}
							<GuardedButton permission="role.bind" class="icon-button" aria-label="Remove" onclick={() => deleteUser(it.email)}>
								<i class="fa-solid fa-trash-alt"></i>
							</GuardedButton>
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={users} {error} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
