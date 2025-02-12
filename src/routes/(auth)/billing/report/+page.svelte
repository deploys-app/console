<script>
	import { page } from '$app/stores'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'
	import api from '$lib/api'

	let { data } = $props()

	const { billingAccount } = data

	const filter = $state({
		range: $page.url.searchParams.get('range') || 'this_month',
		projectSids: []
	})

	let report = $state()

	async function fetchReport () {
		const resp = await api.invoke('billing.report', {
			id: billingAccount.id,
			range: filter.range,
			projectSids: filter.projectSids ?? []
		}, fetch)
		if (!resp.ok) {
			return
		}
		report = resp.result

		filter.projectSids = report.projectSids ?? []
		initChart()
	}

	/** @type {HTMLElement} */
	let chartEl
	let chart = null

	function initChart () {
		chart?.destroy()
		chart = Highcharts.chart(chartEl, {
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

		return () => {
			chart?.destroy()
		}
	})
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href="/billing" class="nm-link"><h6>Billing</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<a href={`/billing/detail?id=${billingAccount.id}`} class="nm-link"><h6>{billingAccount.name}</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Report</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300">
	<div class="lo-grid-span-horizontal _g-5">
		<div class="lo-grid-span-horizontal _g-4">
			<div class="nm-select">
				<select bind:value={filter.range} onchange={fetchReport}>
					<option value="this_month">This month</option>
					<option value="prev_month">Prev month</option>
					<option value="3_months">3 months</option>
					<option value="6_months">6 months</option>
					<option value="year">1 year</option>
				</select>
			</div>
		</div>
	</div>

	<div class="_dp-f _fw-w _jtfct-spbtw _alit-ct _mgt-8">
		<div class="_dp-f _fw-w">
			{#each (report?.projectList ?? []) as it}
				<div class="nm-checkbox _mgbt-4 _mgr-5">
					<input id={`c-${it.sid}`} type=checkbox value={it.sid} bind:group={filter.projectSids} onchange={fetchReport}>
					<label for={`c-${it.sid}`}>{it.sid}</label>
				</div>
			{/each}
		</div>
	</div>

	<div bind:this={chartEl} class="_mgv-5"></div>

	<br>

	<h5><strong>Billings</strong></h5>
	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
				<tr>
					<th>Project</th>
					<th>Name</th>
					<th>Usage Value</th>
					<th>Billing Value</th>
				</tr>
			</thead>
			<tbody>
				{#each (report?.list ?? []) as it}
					<tr>
						<td>{it.projectSid}</td>
						<td>{it.name}</td>
						<td>{it.usageValue}</td>
						<td>{it.billingValue}</td>
					</tr>
				{:else}
					<NoDataRow span={5} />
				{/each}
			</tbody>
		</table>
	</div>
</div>
