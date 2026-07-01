<script lang="ts">
	import dayjs from 'dayjs'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import InvoiceStatusBadge from '$lib/components/InvoiceStatusBadge.svelte'
	import * as format from '$lib/format'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const invoices = $derived(data.invoices)
	const error = $derived(data.error)

	function period (periodStart: string, periodEnd: string) {
		const s = dayjs(periodStart)
		const e = dayjs(periodEnd).subtract(1, 'day')
		if (s.isSame(e, 'month')) {
			return s.format('MMM YYYY')
		}
		return `${s.format('YYYY-MM-DD')} → ${e.format('YYYY-MM-DD')}`
	}

	function money (v: number, currency: string) {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
	}
</script>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table">
			<thead>
				<tr>
					<th>Number</th>
					<th>Period</th>
					<th class="is-align-right">Total</th>
					<th>Status</th>
					<th class="is-hide-mobile">Receipt no.</th>
					<th class="is-hide-mobile">Issued</th>
					<th class="is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each invoices as it (it.id)}
					<tr>
						<td>
							<a class="link" href={`/billing/invoice?id=${it.id}`}>{it.number}</a>
						</td>
						<td>{period(it.periodStart, it.periodEnd)}</td>
						<td class="is-align-right tabular-nums">{money(it.total, it.currency)}</td>
						<td><InvoiceStatusBadge status={it.status} /></td>
						<td class="is-hide-mobile">{it.receiptNumber || '—'}</td>
						<td class="is-hide-mobile">{format.datetime(it.issuedAt)}</td>
						<td class="is-align-right">
							{#if it.status === 'open'}
								<a class="button is-size-small is-icon-left" href={`/billing/invoice?id=${it.id}`}>
									<i class="fa-solid fa-receipt"></i>
									Pay
								</a>
							{:else}
								<a class="link text-sm" href={`/billing/invoice?id=${it.id}`}>View</a>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={7} list={invoices} {error} />
				<ErrorRow span={7} {error} />
			</tbody>
		</table>
	</div>
</div>
