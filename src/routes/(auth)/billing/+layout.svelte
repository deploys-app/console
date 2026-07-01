<script lang="ts">
	import { page } from '$app/stores'
	import { billingRoleLabel, canManageBilling } from '$lib/billing'

	const { children } = $props()

	// The active account (when one is in context). Every account sub-page returns
	// `billingAccount` from its loader — including its `role` — so the portal
	// chrome reads it straight off page data instead of re-fetching.
	const account = $derived($page.data.billingAccount as Api.BillingAccount | undefined)
	const pathname = $derived($page.url.pathname)

	type Tab = { label: string, icon: string, path: string, match: string[], show: boolean }

	const tabs = $derived.by<Tab[]>(() => {
		if (!account) return []
		const id = account.id
		return [
			{ label: 'Overview', icon: 'fa-gauge-high', path: `/billing/detail?id=${id}`, match: ['/billing/detail'], show: true },
			{ label: 'Invoices', icon: 'fa-file-invoice-dollar', path: `/billing/invoices?id=${id}`, match: ['/billing/invoices', '/billing/invoice'], show: true },
			{ label: 'Receipts', icon: 'fa-receipt', path: `/billing/receipts?id=${id}`, match: ['/billing/receipts'], show: true },
			{ label: 'Usage', icon: 'fa-chart-line', path: `/billing/report?id=${id}`, match: ['/billing/report'], show: true },
			{ label: 'Members', icon: 'fa-user-group', path: `/billing/members?id=${id}`, match: ['/billing/members'], show: canManageBilling(account.role) }
		].filter((t) => t.show)
	})

	function isActive (tab: Tab): boolean {
		return tab.match.includes(pathname)
	}
</script>

<div class="portal">
	<header class="portal-head">
		<a class="portal-brand" href="/billing">
			<span class="portal-mark"><i class="fa-solid fa-file-invoice-dollar"></i></span>
			<span class="portal-title">Billing</span>
		</a>

		{#if account}
			<div class="portal-account">
				<div class="portal-account-name" title={account.name}>{account.name}</div>
				<span class="role-pill is-{account.role}">{billingRoleLabel[account.role] ?? account.role}</span>
			</div>
		{/if}
	</header>

	{#if tabs.length > 0}
		<nav class="portal-tabs" aria-label="Billing account sections">
			{#each tabs as tab (tab.label)}
				<a class="portal-tab" class:is-active={isActive(tab)} href={tab.path}>
					<i class="fa-solid {tab.icon}"></i>
					<span>{tab.label}</span>
				</a>
			{/each}
		</nav>
	{/if}

	<div class="portal-body">
		{@render children()}
	</div>
</div>

<style>
	.portal {
		display: grid;
		gap: 0;
	}

	.portal-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	.portal-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		color: inherit;
		text-decoration: none;
	}

	.portal-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.65rem;
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
		font-size: 1.05rem;
	}

	.portal-title {
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.portal-account {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	.portal-account-name {
		font-weight: 600;
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.role-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.6rem;
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

	.role-pill.is-admin {
		color: hsl(var(--hsl-info, var(--hsl-primary)));
		background: hsl(var(--hsl-info, var(--hsl-primary)) / 0.12);
	}

	.role-pill.is-accountant {
		color: hsl(var(--hsl-positive));
		background: hsl(var(--hsl-positive) / 0.12);
	}

	.portal-tabs {
		display: flex;
		gap: 0.15rem;
		overflow-x: auto;
		border-bottom: 1px solid hsl(var(--hsl-line));
		margin-bottom: 1.5rem;
		scrollbar-width: none;
	}

	.portal-tabs::-webkit-scrollbar {
		display: none;
	}

	.portal-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		color: hsl(var(--hsl-content) / 0.6);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s ease, border-color 0.15s ease;
	}

	.portal-tab i {
		font-size: 0.9em;
	}

	.portal-tab:hover {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.portal-tab.is-active {
		color: hsl(var(--hsl-primary));
		border-bottom-color: hsl(var(--hsl-primary));
	}
</style>
