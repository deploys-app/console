<script lang="ts">
	import dayjs from 'dayjs'
	import InvoiceStatusBadge from '$lib/components/InvoiceStatusBadge.svelte'
	import PayInvoiceModal from '$lib/components/PayInvoiceModal.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const invoice = $derived(data.invoice)
	const billingAccount = $derived(data.billingAccount)

	let downloading = $state(false)
	let downloadingReceipt = $state(false)
	let payModal = $state<ReturnType<typeof PayInvoiceModal> | null>(null)

	function onSlipUploaded () {
		modal.success({ content: 'Payment slip uploaded. We\'ll verify it and mark the invoice as paid.' })
	}

	/**
	 * Shared download flow for the invoice and receipt PDFs.
	 * fn is the api function name; fallbackError is the message shown when the
	 * API returns a blank error.
	 */
	async function download (fn: string, fallbackError: string) {
		try {
			const resp = await api.invoke<Api.InvoiceDownloadResult>(fn, { invoiceId: invoice.id }, fetch)
			if (!resp.ok || !resp.result) {
				// Show the API's message when present (e.g. the PDF-unavailable
				// error), else a clear fallback — arpc returns a blank `{}` for
				// unexpected 500s, which would otherwise be an empty modal.
				modal.error({ error: resp.error?.message ? resp.error : fallbackError })
				return
			}
			// The dropbox link serves the file as an attachment, so navigating
			// to it downloads rather than leaves the page.
			window.location.href = resp.result.downloadUrl
		} catch (err) {
			// Defensive: a network failure (fetch rejection) shouldn't leave the
			// button stuck spinning with no feedback.
			modal.error({ error: err })
		}
	}

	async function downloadPDF () {
		if (downloading) return
		downloading = true
		try {
			await download('billing.downloadInvoice', 'Could not download the invoice PDF. Please try again.')
		} finally {
			downloading = false
		}
	}

	async function downloadReceipt () {
		if (downloadingReceipt) return
		downloadingReceipt = true
		try {
			await download('billing.downloadReceipt', 'Could not download the receipt PDF. Please try again.')
		} finally {
			downloadingReceipt = false
		}
	}

	// Attach a withholding-tax certificate after the fact (company invoices). Shown
	// while the invoice is still open (may withhold) or once it was paid with
	// withholding — for customers who send the 50 ทวิ certificate later.
	const MAX_CERT_SIZE = 10 * 1024 * 1024
	let attachingCert = $state(false)
	let elCert = $state<HTMLInputElement | null>(null)
	const canAttachCert = $derived(
		invoice.taxEntityType === 'company' &&
		(invoice.status === 'open' || invoice.withholdingTaxAmount > 0)
	)

	async function onCertChange (e: Event) {
		const input = e.currentTarget as HTMLInputElement
		const file = input.files?.[0] ?? null
		input.value = ''
		if (!file) return
		if (file.size > MAX_CERT_SIZE) {
			await modal.error({ error: 'Certificate is too large (max 10 MB).' })
			return
		}
		attachingCert = true
		try {
			const fd = new FormData()
			fd.append('id', invoice.id)
			fd.append('whtCert', file)
			const resp = await fetch('/api/billing.uploadWHTCertificate', { method: 'POST', body: fd })
			const res = await resp.json().catch(() => null)
			if (!resp.ok || !res?.ok) {
				await modal.error({ error: res?.error?.message ? res.error : `Upload failed (${resp.status}).` })
				return
			}
			await modal.success({ content: 'Withholding tax certificate attached.' })
		} catch (err) {
			await modal.error({ error: err })
		} finally {
			attachingCert = false
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

	function money (v: number) {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${invoice.currency}`
	}

	const taxRatePct = $derived(`${(invoice.taxRate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`)
	const whtRatePct = $derived(`${(invoice.withholdingTaxRate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`)
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

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		color: hsl(var(--hsl-content) / 0.6);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.15s ease;
	}

	.back-link:hover {
		color: hsl(var(--hsl-primary));
	}
</style>

<a class="back-link" href={`/billing/invoices?id=${billingAccount.id}`}>
	<i class="fa-solid fa-arrow-left"></i>
	Back to invoices
</a>

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
			{#if invoice.status === 'paid'}
				<button
					class="button is-variant-secondary is-icon-left"
					class:is-loading={downloadingReceipt}
					disabled={downloadingReceipt}
					onclick={downloadReceipt}
				>
					<i class="fa-solid fa-file-invoice"></i>
					Download receipt
				</button>
			{/if}
			{#if canAttachCert}
				<input
					bind:this={elCert}
					class="hidden"
					type="file"
					accept="image/*,application/pdf"
					onchange={onCertChange}
				>
				<button
					class="button is-variant-secondary is-icon-left"
					class:is-loading={attachingCert}
					disabled={attachingCert}
					onclick={() => elCert?.click()}
				>
					<i class="fa-solid fa-file-contract"></i>
					Attach WHT certificate
				</button>
			{/if}
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
				{#if invoice.taxEntityType === 'company'}
					<div class="key">Branch</div>
					<div>Head Office (สำนักงานใหญ่)</div>
				{/if}
			</div>
		</div>
		<div>
			<h6 class="mb-3"><strong>Details</strong></h6>
			<div class="meta">
				{#if invoice.status === 'paid' && invoice.receiptNumber}
					<div class="key">Receipt no.</div>
					<div>{invoice.receiptNumber}</div>
				{/if}
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
						<th>#</th>
						<th>Project</th>
						<th class="is-align-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each invoice.lineItems as it, i (i)}
						<tr>
							<td class="text-content/60">{i + 1}</td>
							<td>{it.description || it.project}</td>
							<td class="is-align-right">{money(it.amount)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="3" class="text-content/60">No line items</td>
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
			{#if invoice.withholdingTaxAmount > 0}
				<div class="label">Withholding tax ({whtRatePct})</div>
				<div class="value">−{money(invoice.withholdingTaxAmount)}</div>
			{/if}
		</div>
	</div>

	{#if invoice.status === 'open' && invoice.payment?.accountNo}
		<hr>

		<div>
			<h6 class="mb-3"><strong>How to pay</strong></h6>
			<p class="mb-3 text-content/70">
				Transfer {money(invoice.total)} to the account below, then use the
				<strong>Pay</strong> button above to upload your slip. We'll verify it and
				mark the invoice as paid.
			</p>
			<div class="meta">
				<div class="key">Bank</div>
				<div>{invoice.payment.bank}</div>
				<div class="key">Account name</div>
				<div>{invoice.payment.accountName}</div>
				<div class="key">Account no.</div>
				<div class="tabular-nums">{invoice.payment.accountNo}</div>
				<div class="key">PromptPay</div>
				<div class="tabular-nums">{invoice.payment.promptPay}</div>
			</div>
		</div>
	{/if}
</div>

<PayInvoiceModal bind:this={payModal} onuploaded={onSlipUploaded} />
