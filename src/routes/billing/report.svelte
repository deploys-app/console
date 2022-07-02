<script context="module">
	import api from '$lib/api'

	export async function load ({ url, fetch }) {
		const id = url.searchParams.get('id')

		const billingAccount = await api.invoke('billing.get', { id }, fetch)

		if (!billingAccount.ok) {
			if (billingAccount.error.notFound) {
				return {
					status: 302,
					redirect: '/billing'
				}
			}
			return {
				status: 500,
				error: `billingAccount: ${billingAccount.error.message}`
			}
		}

		return {
			props: {
				billingAccount: billingAccount?.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import NoDataRow from '../../lib/components/NoDataRow.svelte'
	import { onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'

	export let billingAccount

	const filter = {
		range: $page.url.searchParams.get('range') || 'this_month',
		projectSids: []
	}

	let report

	async function fetchReport () {
		const resp = await api.invoke('billing.report', {
			id: billingAccount.id,
			range: filter.range,
			projectSids: filter.projectSids || []
		}, fetch)
		if (!resp.ok) {
			return
		}
		report = resp.result

		report.chart.series
			?.forEach((x) => {
				x.data = x.data.map(Number)
			})
		report.list
			?.forEach((x) => {
				x.usageValue = +x.usageValue
				x.billingValue = +x.billingValue
			})

		filter.projectSids = report.projectSids || []
		initChart()
	}

	const reportChart = {
		el: null,
		chart: null
	}

	function initChart () {
		reportChart.chart && reportChart.chart.destroy()
		reportChart.chart = Highcharts.chart(reportChart.el, {
			chart: {
				type: 'spline',
				scrollablePlotArea: {
					minWidth: 600,
					scrollPositionX: 1
				}
			},
			title: {
				text: 'Usages'
			},
			subtitle: {
				text: ''
			},
			xAxis: {
				categories: report.chart.categories
			},
			yAxis: {
				title: {
					text: 'Cost (THB)'
				}
			},
			tooltip: {
				valueSuffix: ' THB'
			},
			plotOptions: {
				spline: {
					lineWidth: 1,
					states: {
						hover: {
							lineWidth: 3
						}
					},
					marker: {
						enabled: false
					}
				}
			},
			series: report.chart.series,
			responsive: {
				rules: [{
					condition: {
						maxWidth: 500
					},
					chartOptions: {
						legend: {
							layout: 'horizontal',
							align: 'center',
							verticalAlign: 'bottom'
						}
					}
				}]
			}
		})
	}

	onMount(() => {
		hc.init()
		fetchReport()
	})
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href="/billing" class="link"><h6>Billing</h6></a>
		</li>
		<li>
			<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6>{billingAccount.name}</h6></a>
		</li>
		<li>
			<h6>Report</h6>
		</li>
	</ul>
</div>
<br>

<div class="panel">
	<div class="lo-grid-span-horizontal _gg-12px">
		<div class="lo-grid-span-horizontal _gg-8px">
			<div class="select">
				<select bind:value={filter.range} on:change={fetchReport}>
					<option value="this_month">This month</option>
					<option value="prev_month">Prev month</option>
					<option value="3_months">3 months</option>
					<option value="6_months">6 months</option>
					<option value="year">1 year</option>
				</select>
			</div>
		</div>
	</div>

	<div class="_dp-f _fw-w _jtfct-spbtw _alit-ct _mgt-32px">
		<div class="_dp-f _fw-w">
			{#each (report?.projectList || []) as it}
				<div class="checkbox _mgbt-8px _mgr-12px">
					<input id={`c-${it.sid}`} type=checkbox value={it.sid} bind:group={filter.projectSids} on:change={fetchReport}>
					<label for={`c-${it.sid}`}>{it.sid}</label>
				</div>
			{/each}
		</div>
	</div>

	<div bind:this={reportChart.el} class="_mgv-12px"></div>

	<br>

	<h5><strong>Billings</strong></h5>
	<div class="table-container">
		<table class="table -ruled">
			<thead>
				<tr>
					<th>Project</th>
					<th>Name</th>
					<th>Usage Value</th>
					<th>Billing Value</th>
				</tr>
			</thead>
			<tbody>
				{#each (report?.list || []) as it}
					<tr>
						<td>{it.projectSid}</td>
						<td>{it.name}</td>
						<td>{it.usageValue}</td>
						<td>{it.billingValue}</td>
					</tr>
				{:else}
					<NoDataRow span="5" />
				{/each}
			</tbody>
		</table>
	</div>
</div>
