<script lang="ts">
	import dayjs from 'dayjs'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const error = $derived(data.error)
	// A receipt is the proof-of-payment document, so only paid invoices have one.
	const receipts = $derived(data.invoices.filter((it) => it.status === 'paid'))

	// Track the in-flight download per invoice so each row's button spins alone.
	let downloadingId = $state<string | null>(null)

	function period (periodStart: string, periodEnd: string) {
		const s = dayjs(periodStart)
		const e = dayjs(periodEnd).subtract(1, 'day')
		return s.isSame(e, 'month') ? s.format('MMM YYYY') : `${s.format('YYYY-MM-DD')} → ${e.format('YYYY-MM-DD')}`
	}

	function money (v: number, currency: string) {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
	}

	async function downloadReceipt (invoiceId: string) {
		if (downloadingId) return
		downloadingId = invoiceId
		try {
			const resp = await api.invoke<Api.InvoiceDownloadResult>('billing.downloadReceipt', { invoiceId }, fetch)
			if (!resp.ok || !resp.result) {
				modal.error({ error: resp.error?.message ? resp.error : 'Could not download the receipt PDF. Please try again.' })
				return
			}
			window.location.href = resp.result.downloadUrl
		} catch (err) {
			modal.error({ error: err })
		} finally {
			downloadingId = null
		}
	}
</script>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table">
			<thead>
				<tr>
					<th>Receipt no.</th>
					<th>Invoice</th>
					<th>Period</th>
					<th class="is-align-right">Amount</th>
					<th class="is-hide-mobile">Paid</th>
					<th class="is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each receipts as it (it.id)}
					<tr>
						<td class="tabular-nums">{it.receiptNumber || '—'}</td>
						<td><a class="link" href={`/billing/invoice?id=${it.id}`}>{it.number}</a></td>
						<td>{period(it.periodStart, it.periodEnd)}</td>
						<td class="is-align-right tabular-nums">{money(it.total, it.currency)}</td>
						<td class="is-hide-mobile">{format.datetime(it.paidAt) || '—'}</td>
						<td class="is-align-right">
							<button
								class="button is-variant-secondary is-size-small is-icon-left"
								class:is-loading={downloadingId === it.id}
								disabled={downloadingId === it.id}
								onclick={() => downloadReceipt(it.id)}
							>
								<i class="fa-solid fa-download"></i>
								Receipt
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={6} list={receipts} {error} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>

{#if receipts.length === 0 && !error}
	<p class="mt-4 text-content/60 text-sm">
		Receipts appear here once an invoice is paid.
	</p>
{/if}
