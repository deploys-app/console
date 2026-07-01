<script lang="ts">
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import { billingRoleLabel } from '$lib/billing'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccounts = $derived(data.billingAccounts)
	const error = $derived(data.error)
</script>

<div class="head">
	<p class="head-sub">{billingAccounts.length} {billingAccounts.length === 1 ? 'account' : 'accounts'} you can access</p>
	<a class="button is-icon-left" href="/billing/create">
		<i class="fa-solid fa-plus"></i>
		Create account
	</a>
</div>

{#if error}
	<div class="panel is-level-300">
		<table class="table"><tbody><ErrorRow span={1} {error} /></tbody></table>
	</div>
{:else if billingAccounts.length === 0}
	<div class="panel is-level-300 empty">
		<i class="fa-solid fa-file-invoice-dollar"></i>
		<p>You don't have access to any billing accounts yet.</p>
		<a class="button is-variant-secondary is-icon-left" href="/billing/create">
			<i class="fa-solid fa-plus"></i>
			Create your first account
		</a>
	</div>
{:else}
	<div class="account-grid">
		{#each billingAccounts as it (it.id)}
			<a class="account-card" href="/billing/detail?id={it.id}">
				<div class="account-card-top">
					<span class="role-pill is-{it.role}">{billingRoleLabel[it.role] ?? it.role}</span>
					{#if it.active}
						<span class="dot is-positive" title="Active"><i class="fa-solid fa-circle-check"></i></span>
					{:else}
						<span class="dot is-negative" title="Inactive"><i class="fa-solid fa-circle-xmark"></i></span>
					{/if}
				</div>
				<div class="account-name">{it.name}</div>
				<div class="account-id">ID {it.id}</div>
				<div class="account-go">
					Open <i class="fa-solid fa-arrow-right"></i>
				</div>
			</a>
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.head-sub {
		color: hsl(var(--hsl-content) / 0.65);
	}

	.account-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
	}

	.account-card {
		display: grid;
		gap: 0.4rem;
		padding: 1.15rem 1.25rem;
		border-radius: 0.75rem;
		border: 1px solid hsl(var(--hsl-line));
		background: hsl(var(--hsl-base-300));
		color: inherit;
		text-decoration: none;
		box-shadow: var(--raised-z1);
		transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
	}

	.account-card:hover {
		border-color: hsl(var(--hsl-primary));
		transform: translateY(-2px);
		box-shadow: var(--raised-z4);
	}

	.account-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.account-name {
		font-size: 1.1rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.account-id {
		font-size: 0.8rem;
		color: hsl(var(--hsl-content) / 0.55);
		font-variant-numeric: tabular-nums;
	}

	.account-go {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: hsl(var(--hsl-primary));
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.account-card:hover .account-go i {
		transform: translateX(2px);
	}

	.account-go i {
		transition: transform 0.15s ease;
	}

	.role-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.72rem;
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

	.role-pill.is-admin {
		color: hsl(var(--hsl-info, var(--hsl-primary)));
		background: hsl(var(--hsl-info, var(--hsl-primary)) / 0.12);
	}

	.role-pill.is-accountant {
		color: hsl(var(--hsl-positive));
		background: hsl(var(--hsl-positive) / 0.12);
	}

	.dot.is-positive {
		color: hsl(var(--hsl-positive));
	}

	.dot.is-negative {
		color: hsl(var(--hsl-content) / 0.35);
	}

	.empty {
		display: grid;
		justify-items: center;
		gap: 1rem;
		padding: 3rem 1.5rem;
		text-align: center;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.empty i {
		font-size: 2rem;
		color: hsl(var(--hsl-content) / 0.3);
	}
</style>
