<script lang="ts">
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccount = $derived(data.billingAccount)

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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href="/billing" class="link"><h6>Billing</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{billingAccount.name}</h6>
	</div>
</div>

<br>

<div class="grid gap-6">
	<div class="panel is-level-300">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="grid gap-2 min-w-0">
				<h3 class="min-w-0 wrap-anywhere"><strong>{billingAccount.name}</strong></h3>
				<div class="flex flex-wrap items-center gap-2 text-sm text-content/70">
					<span>ID</span>
					<code class="account-id">{billingAccount.id}</code>
				</div>
			</div>
			{#if billingAccount.active}
				<span class="status-badge is-positive">
					<i class="fa-solid fa-circle-check"></i>
					Active
				</span>
			{:else}
				<span class="status-badge is-negative">
					<i class="fa-solid fa-circle-xmark"></i>
					Inactive
				</span>
			{/if}
		</div>
	</div>

	<div class="panel is-level-300">
		<h5 class="mb-4"><strong>Quick actions</strong></h5>
		<div class="grid gap-3 sm:grid-cols-2">
			<a class="action-card" href={`/billing/report?id=${billingAccount.id}`}>
				<div class="action-icon">
					<i class="fa-solid fa-chart-line"></i>
				</div>
				<div class="grid gap-1 min-w-0">
					<div><strong>Usage report</strong></div>
					<p class="text-sm text-content/70">View usage and cost charts across projects.</p>
				</div>
			</a>
			<a class="action-card" href={`/billing/invoices?id=${billingAccount.id}`}>
				<div class="action-icon">
					<i class="fa-solid fa-file-invoice-dollar"></i>
				</div>
				<div class="grid gap-1 min-w-0">
					<div><strong>Invoices</strong></div>
					<p class="text-sm text-content/70">Browse and download past invoices.</p>
				</div>
			</a>
		</div>
	</div>

	<div class="panel is-level-300">
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<h5><strong>Billing information</strong></h5>
			<a class="button is-variant-secondary is-size-small" href={`/billing/create?id=${billingAccount.id}`}>
				<i class="fa-solid fa-pen-to-square"></i>
				Edit
			</a>
		</div>
		<dl class="info-list">
			<dt>Account name</dt>
			<dd>{billingAccount.name}</dd>
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
</div>

<style>
	.account-id {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.85em;
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
		background-color: hsl(var(--hsl-base-200));
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.85rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 0;
	}

	.status-badge.is-positive {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.status-badge.is-negative {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.action-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-200) / 0.5);
		color: inherit;
		text-decoration: none;
		transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
	}

	.action-card:hover {
		border-color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.06);
	}

	.action-icon {
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		font-size: 1.125rem;
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.1);
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
