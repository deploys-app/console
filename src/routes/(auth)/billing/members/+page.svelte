<script lang="ts">
	import gravatarUrl from 'gravatar-url'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import { billingRoleLabel, billingRoleDescription } from '$lib/billing'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const account = $derived(data.billingAccount)
	const owner = $derived(data.owner)
	const members = $derived(data.members)
	const error = $derived(data.error)

	let inviteEmail = $state('')
	let inviteRole = $state<'admin' | 'accountant'>('accountant')
	let inviting = $state(false)
	let busyEmail = $state<string | null>(null)

	async function invite (e: Event) {
		e.preventDefault()
		if (inviting) return
		const email = inviteEmail.trim()
		if (!email) return
		inviting = true
		try {
			const resp = await api.invoke('billing.addMember', { id: account.id, email, role: inviteRole }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			inviteEmail = ''
			inviteRole = 'accountant'
			api.invalidate('billing.listMembers')
		} finally {
			inviting = false
		}
	}

	async function changeRole (email: string, role: string) {
		busyEmail = email
		try {
			const resp = await api.invoke('billing.addMember', { id: account.id, email, role }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
			}
			// Re-fetch on both success and failure: the native <select> already
			// shows the user's pick, so on a rejected change we must reload to snap
			// it back to the member's true role.
			api.invalidate('billing.listMembers')
		} finally {
			busyEmail = null
		}
	}

	function removeMember (email: string) {
		modal.confirm({
			title: `Remove ${email}? They will immediately lose access to this billing account.`,
			yes: 'Remove',
			callback: async () => {
				busyEmail = email
				try {
					const resp = await api.invoke('billing.removeMember', { id: account.id, email }, fetch)
					if (!resp.ok) {
						modal.error({ error: resp.error })
						return
					}
					api.invalidate('billing.listMembers')
				} finally {
					busyEmail = null
				}
			}
		})
	}
</script>

<div class="grid gap-6">
	<div class="panel is-level-300">
		<div class="mb-1"><h5><strong>People with access</strong></h5></div>
		<p class="text-sm text-content/65 mb-5">
			Invite people to help manage this billing account. Members can view invoices and pay;
			admins can also edit billing details and manage members.
		</p>

		<div class="member-list">
			<!-- Owner: implicit, always present, never editable/removable here -->
			<div class="member-row">
				<div class="member-id">
					<img class="avatar" src={gravatarUrl(owner, { default: 'mp' })} alt="" />
					<div class="min-w-0">
						<div class="member-email">{owner}</div>
						<div class="member-meta">Account owner</div>
					</div>
				</div>
				<div class="member-controls">
					<span class="role-pill is-owner">{billingRoleLabel.owner}</span>
				</div>
			</div>

			{#each members as m (m.email)}
				<div class="member-row">
					<div class="member-id">
						<img class="avatar" src={gravatarUrl(m.email, { default: 'mp' })} alt="" />
						<div class="min-w-0">
							<div class="member-email">{m.email}</div>
							<div class="member-meta">
								Added {format.datetime(m.createdAt)}{m.createdBy ? ` · by ${m.createdBy}` : ''}
							</div>
						</div>
					</div>
					<div class="member-controls">
						<div class="select role-select">
							<select
								value={m.role}
								disabled={busyEmail === m.email}
								onchange={(e) => changeRole(m.email, (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value="admin">Admin</option>
								<option value="accountant">Accountant</option>
							</select>
						</div>
						<button
							class="button is-variant-tertiary is-size-small icon-only"
							title="Remove member"
							aria-label="Remove member"
							disabled={busyEmail === m.email}
							onclick={() => removeMember(m.email)}
						>
							<i class="fa-solid fa-trash-can"></i>
						</button>
					</div>
				</div>
			{/each}

			{#if error}
				<div class="member-empty text-negative">{error.message ?? 'Could not load members.'}</div>
			{:else if members.length === 0}
				<div class="member-empty">No members yet — invite someone below.</div>
			{/if}
		</div>
	</div>

	<div class="panel is-level-300">
		<h5 class="mb-4"><strong>Invite a member</strong></h5>
		<form class="invite" onsubmit={invite}>
			<div class="field grow">
				<label for="invite-email">Email</label>
				<div class="input">
					<input
						id="invite-email"
						type="email"
						placeholder="accountant@example.com"
						bind:value={inviteEmail}
						required
					/>
				</div>
			</div>
			<div class="field role-field">
				<label for="invite-role">Role</label>
				<div class="select">
					<select id="invite-role" bind:value={inviteRole}>
						<option value="accountant">Accountant</option>
						<option value="admin">Admin</option>
					</select>
				</div>
			</div>
			<div class="field invite-submit">
				<button class="button is-icon-left" type="submit" class:is-loading={inviting} disabled={inviting}>
					<i class="fa-solid fa-user-plus"></i>
					Invite
				</button>
			</div>
		</form>
		<p class="role-hint text-sm text-content/60">
			<strong>{billingRoleLabel[inviteRole]}:</strong> {billingRoleDescription[inviteRole]}
		</p>
	</div>
</div>

<style>
	.member-list {
		display: grid;
		gap: 0.25rem;
	}

	.member-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid hsl(var(--hsl-line) / 0.6);
	}

	.member-row:last-child {
		border-bottom: 0;
	}

	.member-id {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.avatar {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 50%;
		background: hsl(var(--hsl-content) / 0.06);
		object-fit: cover;
	}

	.member-email {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.member-meta {
		font-size: 0.8rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.member-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Compact, fixed-width role picker in a member row (the .select wrapper is
	   width:100% by default, which would stretch across the row). */
	.role-select {
		width: 10rem;
		min-height: 2.25rem;
	}

	.icon-only {
		color: hsl(var(--hsl-content) / 0.6);
	}

	.icon-only:hover {
		color: hsl(var(--hsl-negative));
	}

	.member-empty {
		padding: 1rem 0;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.invite {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 1rem;
	}

	.invite .grow {
		flex: 1;
		min-width: 14rem;
	}

	.invite .role-field {
		width: 11rem;
	}

	.invite-submit {
		justify-content: flex-end;
	}

	.role-hint {
		margin-top: 1rem;
	}

	.role-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content) / 0.7);
		background: hsl(var(--hsl-content) / 0.08);
	}

	.role-pill.is-owner {
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
	}
</style>
