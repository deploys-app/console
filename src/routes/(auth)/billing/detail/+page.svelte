<script lang="ts">
	import dayjs from 'dayjs'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import InvoiceStatusBadge from '$lib/components/InvoiceStatusBadge.svelte'
	import { canManageBilling, canDeleteBilling } from '$lib/billing'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccount = $derived(data.billingAccount)
	const invoices = $derived(data.invoices)

	const canManage = $derived(canManageBilling(billingAccount.role))
	const canDelete = $derived(canDeleteBilling(billingAccount.role))

	const openInvoices = $derived(invoices.filter((it) => it.status === 'open'))
	const currency = $derived(openInvoices[0]?.currency ?? invoices[0]?.currency ?? 'THB')
	const amountDue = $derived(openInvoices.reduce((sum, it) => sum + it.total, 0))
	// The most recent open invoice is the one to settle first.
	const payTarget = $derived(openInvoices[0])
	const latest = $derived(invoices[0])

	function money (v: number, cur = currency) {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
	}

	function period (periodStart: string, periodEnd: string) {
		const s = dayjs(periodStart)
		const e = dayjs(periodEnd).subtract(1, 'day')
		return s.isSame(e, 'month') ? s.format('MMM YYYY') : `${s.format('YYYY-MM-DD')} → ${e.format('YYYY-MM-DD')}`
	}

	function deleteItem () {
		modal.confirm({
			title: `Delete "${billingAccount.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('billing.delete', { id: billingAccount.id }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto('/billing')
			}
		})
	}
</script>

<div class="grid gap-6">
	<!-- Amount due hero — the accountant's primary concern -->
	<div class="panel is-level-300 hero" class:is-due={amountDue > 0}>
		<div class="hero-main">
			<div class="hero-label">
				{#if amountDue > 0}
					Amount due
				{:else}
					Balance
				{/if}
			</div>
			<div class="hero-amount">{money(amountDue)}</div>
			<div class="hero-sub">
				{#if amountDue > 0}
					{openInvoices.length} open {openInvoices.length === 1 ? 'invoice' : 'invoices'}
				{:else}
					<i class="fa-solid fa-circle-check text-positive"></i> You're all caught up
				{/if}
			</div>
		</div>
		<div class="hero-actions">
			{#if payTarget}
				<a class="button is-icon-left" href={`/billing/invoice?id=${payTarget.id}`}>
					<i class="fa-solid fa-receipt"></i>
					Pay now
				</a>
			{/if}
			<a class="button is-variant-secondary is-icon-left" href={`/billing/invoices?id=${billingAccount.id}`}>
				<i class="fa-solid fa-file-invoice-dollar"></i>
				All invoices
			</a>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Latest invoice -->
		<div class="panel is-level-300">
			<div class="flex items-center justify-between mb-4">
				<h5><strong>Latest invoice</strong></h5>
				<a class="link text-sm" href={`/billing/invoices?id=${billingAccount.id}`}>View all</a>
			</div>
			{#if latest}
				<a class="latest" href={`/billing/invoice?id=${latest.id}`}>
					<div class="grid gap-1 min-w-0">
						<div class="flex items-center gap-2">
							<strong>{latest.number}</strong>
							<InvoiceStatusBadge status={latest.status} />
						</div>
						<div class="text-sm text-content/65">{period(latest.periodStart, latest.periodEnd)}</div>
					</div>
					<div class="latest-amount">{money(latest.total, latest.currency)}</div>
				</a>
			{:else}
				<p class="text-content/60">No invoices yet.</p>
			{/if}
		</div>

		<!-- Quick links -->
		<div class="panel is-level-300">
			<h5 class="mb-4"><strong>Quick links</strong></h5>
			<div class="grid gap-2">
				<a class="quick" href={`/billing/receipts?id=${billingAccount.id}`}>
					<i class="fa-solid fa-receipt"></i>
					<span>Receipts</span>
					<i class="fa-solid fa-chevron-right chevron"></i>
				</a>
				<a class="quick" href={`/billing/report?id=${billingAccount.id}`}>
					<i class="fa-solid fa-chart-line"></i>
					<span>Usage report</span>
					<i class="fa-solid fa-chevron-right chevron"></i>
				</a>
				{#if canManage}
					<a class="quick" href={`/billing/members?id=${billingAccount.id}`}>
						<i class="fa-solid fa-user-group"></i>
						<span>Members</span>
						<i class="fa-solid fa-chevron-right chevron"></i>
					</a>
				{/if}
			</div>
		</div>
	</div>

	<!-- Billing information -->
	<div class="panel is-level-300">
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<h5><strong>Billing information</strong></h5>
			<div class="flex items-center gap-3">
				{#if billingAccount.active}
					<span class="status-badge is-positive"><i class="fa-solid fa-circle-check"></i> Active</span>
				{:else}
					<span class="status-badge is-negative"><i class="fa-solid fa-circle-xmark"></i> Inactive</span>
				{/if}
				{#if canManage}
					<a class="button is-variant-secondary is-size-small" href={`/billing/create?id=${billingAccount.id}`}>
						<i class="fa-solid fa-pen-to-square"></i>
						Edit
					</a>
				{/if}
			</div>
		</div>
		<dl class="info-list">
			<dt>Account name</dt>
			<dd>{billingAccount.name}</dd>
			<dt>Account ID</dt>
			<dd class="tabular-nums">{billingAccount.id}</dd>
			<dt>Entity type</dt>
			<dd>{billingAccount.type === 'company' ? 'Company' : 'Individual'}</dd>
			<dt>Tax ID</dt>
			<dd>{billingAccount.taxId}</dd>
			<dt>Name</dt>
			<dd>{billingAccount.taxName}</dd>
			<dt>Address</dt>
			<dd class="whitespace-pre-line">{billingAccount.taxAddress}</dd>
		</dl>
	</div>

	<!-- Danger zone (owner only) -->
	{#if canDelete}
		<div class="panel is-level-300">
			<h5 class="mb-4"><strong>Danger zone</strong></h5>
			<div class="danger-zone">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="grid gap-1 min-w-0">
						<div><strong>Delete billing account</strong></div>
						<p class="text-sm text-content/70">
							Permanently removes this billing account. This action cannot be undone.
						</p>
					</div>
					<button class="button is-variant-negative shrink-0" type="button" onclick={deleteItem}>
						Delete account
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.hero-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.hero-amount {
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		margin: 0.15rem 0 0.35rem;
	}

	.hero.is-due .hero-amount {
		color: hsl(var(--hsl-warning, var(--hsl-primary)));
	}

	.hero-sub {
		color: hsl(var(--hsl-content) / 0.7);
		font-size: 0.9rem;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.latest {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.6rem;
		border: 1px solid hsl(var(--hsl-line));
		background: hsl(var(--hsl-base-200) / 0.5);
		color: inherit;
		text-decoration: none;
		transition: border-color 0.15s ease;
	}

	.latest:hover {
		border-color: hsl(var(--hsl-primary));
	}

	.latest-amount {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.quick {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: 0.5rem;
		color: inherit;
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.quick:hover {
		background: hsl(var(--hsl-content) / 0.05);
	}

	.quick > span {
		flex: 1;
	}

	.quick > i:first-child {
		width: 1.25rem;
		text-align: center;
		color: hsl(var(--hsl-primary));
	}

	.quick .chevron {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.4);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.status-badge.is-positive {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.status-badge.is-negative {
		color: hsl(var(--hsl-content) / 0.6);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.info-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.25rem 1.5rem;
	}

	.info-list dt {
		color: hsl(var(--hsl-content) / 0.65);
		font-size: 0.875rem;
	}

	.info-list dd {
		overflow-wrap: anywhere;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid hsl(var(--hsl-line) / 0.6);
		margin-bottom: 0.25rem;
	}

	.info-list dd:last-child {
		border-bottom: 0;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	@media (min-width: 640px) {
		.info-list {
			grid-template-columns: 180px 1fr;
			gap: 0.85rem 1.5rem;
		}

		.info-list dt {
			padding-top: 0.1rem;
		}

		.info-list dd {
			padding-bottom: 0.85rem;
			margin-bottom: 0;
		}
	}

	.danger-zone {
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--hsl-negative) / 0.4);
		background-color: hsl(var(--hsl-negative) / 0.04);
		padding: 1rem 1.25rem;
	}
</style>
