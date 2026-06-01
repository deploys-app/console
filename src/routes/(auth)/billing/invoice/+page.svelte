<script>
	import dayjs from 'dayjs'
	import InvoiceStatusBadge from '$lib/components/InvoiceStatusBadge.svelte'
	import PayInvoiceModal from '$lib/components/PayInvoiceModal.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const invoice = $derived(data.invoice)
	const billingAccount = $derived(data.billingAccount)

	let downloading = $state(false)
	let payModal = $state(/** @type {?ReturnType<typeof PayInvoiceModal>} */ (null))

	function onSlipUploaded () {
		modal.success({ content: 'Payment slip uploaded. We\'ll verify it and mark the invoice as paid.' })
	}

	async function downloadPDF () {
		if (downloading) return
		downloading = true
		try {
			/** @type {Api.Response<Api.InvoiceDownloadResult>} */
			const resp = await api.invoke('billing.downloadInvoice', { invoiceId: invoice.id }, fetch)
			if (!resp.ok || !resp.result) {
				// Show the API's message when present (e.g. the PDF-unavailable
				// error), else a clear fallback — arpc returns a blank `{}` for
				// unexpected 500s, which would otherwise be an empty modal.
				modal.error({ error: resp.error?.message ? resp.error : 'Could not download the invoice PDF. Please try again.' })
				return
			}
			// The dropbox link serves the file as an attachment, so navigating
			// to it downloads rather than leaves the page.
			window.location.href = resp.result.downloadUrl
		} catch (err) {
			// Defensive: a network failure (fetch rejection) shouldn't leave the
			// button stuck spinning with no feedback.
			modal.error({ error: err })
		} finally {
			downloading = false
		}
	}

	const periodLabel = $derived.by(() => {
		const s = dayjs(invoice.periodStart)
		const e = dayjs(invoice.periodEnd).subtract(1, 'day')
		if (s.isSame(e, 'month')) {
			return s.format('MMMM YYYY')
		}
		return `${s.format('YYYY-MM-DD')} → ${e.format('YYYY-MM-DD')}`
	})

	/**
	 * @param {number} v
	 */
	function money (v) {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${invoice.currency}`
	}

	/**
	 * Unit prices can be a tiny per-unit rate (e.g. a per-hour or per-second
	 * compute price) that rounds to 0.00 at the 2-decimal precision used for
	 * currency totals. Keep a 2-decimal floor, but for sub-cent values widen the
	 * precision enough to keep the rate's significant digits visible.
	 * @param {number} v
	 */
	function unitPrice (v) {
		const abs = Math.abs(v)
		const decimals = abs > 0 && abs < 0.01
			? Math.min(10, Math.ceil(-Math.log10(abs)) + 3)
			: 2
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals })} ${invoice.currency}`
	}

	/**
	 * @param {number} v
	 */
	function quantity (v) {
		return v.toLocaleString(undefined, { maximumFractionDigits: 4 })
	}

	const taxRatePct = $derived(`${(invoice.taxRate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`)
</script>

<style>
	.totals {
		display: grid;
		grid-template-columns: max-content max-content;
		justify-content: end;
		column-gap: 2rem;
		row-gap: 0.4rem;
		margin-top: 1.5rem;
	}

	.totals .label {
		color: hsl(var(--hsl-content) / 0.7);
	}

	.totals .value {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.totals .grand.label,
	.totals .grand.value {
		font-weight: 600;
		font-size: 1.05rem;
		padding-top: 0.5rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.15);
	}

	.meta {
		display: grid;
		grid-template-columns: max-content 1fr;
		column-gap: 1.5rem;
		row-gap: 0.4rem;
	}

	.meta .key {
		color: hsl(var(--hsl-content) / 0.65);
	}

	.is-align-right {
		text-align: right;
	}
</style>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href="/billing" class="link"><h6>Billing</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6>{billingAccount.name}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/billing/invoices?id=${billingAccount.id}`} class="link"><h6>Invoices</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{invoice.number}</h6>
	</div>
</div>

<br>

<div class="panel is-level-300 grid gap-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h3 class="mb-1"><strong>{invoice.number}</strong></h3>
			<div class="text-content/70">{periodLabel}</div>
		</div>
		<div class="flex items-center gap-3">
			<InvoiceStatusBadge status={invoice.status} />
			<button
				class="button is-variant-secondary is-icon-left"
				class:is-loading={downloading}
				disabled={downloading}
				onclick={downloadPDF}
			>
				<i class="fa-solid fa-download"></i>
				Download PDF
			</button>
			{#if invoice.status === 'open'}
				<button class="button is-icon-left" onclick={() => payModal?.open(invoice)}>
					<i class="fa-solid fa-receipt"></i>
					Pay
				</button>
			{/if}
		</div>
	</div>

	<hr>

	<div class="grid gap-6 lg:grid-cols-2">
		<div>
			<h6 class="mb-3"><strong>Bill to</strong></h6>
			<div class="meta">
				<div class="key">Name</div>
				<div>{invoice.taxName}</div>
				<div class="key">Tax ID</div>
				<div>{invoice.taxId}</div>
				<div class="key">Address</div>
				<div class="whitespace-pre-line">{invoice.taxAddress}</div>
			</div>
		</div>
		<div>
			<h6 class="mb-3"><strong>Details</strong></h6>
			<div class="meta">
				<div class="key">Issued at</div>
				<div>{format.datetime(invoice.issuedAt)}</div>
				<div class="key">Paid at</div>
				<div>{format.datetime(invoice.paidAt) || '—'}</div>
				{#if invoice.voidedAt && !invoice.voidedAt.startsWith('0001-01-01')}
					<div class="key">Voided at</div>
					<div>{format.datetime(invoice.voidedAt)}</div>
				{/if}
				<div class="key">Currency</div>
				<div>{invoice.currency}</div>
			</div>
		</div>
	</div>

	<hr>

	<div>
		<h6 class="mb-3"><strong>Line items</strong></h6>
		<div class="table-container">
			<table class="table">
				<thead>
					<tr>
						<th>Description</th>
						<th class="is-align-right">Quantity</th>
						<th>Unit</th>
						<th class="is-align-right">Unit price</th>
						<th class="is-align-right">Discount</th>
						<th class="is-align-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each invoice.lineItems as it, i (i)}
						<tr>
							<td>{it.description || it.sku}</td>
							<td class="is-align-right">{quantity(it.quantity)}</td>
							<td>{it.unit}</td>
							<td class="is-align-right">{unitPrice(it.unitPrice)}</td>
							<td class="is-align-right">{it.discount ? `-${money(it.discount)}` : '—'}</td>
							<td class="is-align-right">{money(it.amount)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="text-content/60">No line items</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="totals">
			<div class="label">Subtotal</div>
			<div class="value">{money(invoice.subtotal)}</div>
			<div class="label">Tax ({taxRatePct})</div>
			<div class="value">{money(invoice.taxAmount)}</div>
			<div class="grand label">Total</div>
			<div class="grand value">{money(invoice.total)}</div>
		</div>
	</div>
</div>

<PayInvoiceModal bind:this={payModal} onuploaded={onSlipUploaded} />
