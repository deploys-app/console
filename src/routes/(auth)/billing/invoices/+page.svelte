<script lang="ts">
	import dayjs from 'dayjs'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import InvoiceStatusBadge from '$lib/components/InvoiceStatusBadge.svelte'
	import * as format from '$lib/format'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccount = $derived(data.billingAccount)
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href="/billing" class="link"><h6>Billing</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6>{billingAccount.name}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Invoices</h6>
	</div>
</div>

<br>

<div class="panel is-level-300">
	<div class="table-container mt-4">
		<table class="table">
			<thead>
				<tr>
					<th>Number</th>
					<th>Period</th>
					<th class="is-align-right">Total</th>
					<th>Status</th>
					<th>Issued</th>
				</tr>
			</thead>
			<tbody>
				{#each invoices as it (it.id)}
					<tr>
						<td>
							<a class="link" href={`/billing/invoice?id=${it.id}`}>{it.number}</a>
						</td>
						<td>{period(it.periodStart, it.periodEnd)}</td>
						<td class="is-align-right">{money(it.total, it.currency)}</td>
						<td><InvoiceStatusBadge status={it.status} /></td>
						<td>{format.datetime(it.issuedAt)}</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={invoices} {error} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
