<script context="module">
	export function load ({ stuff }) {
		const {
			deployment
		} = stuff

		return {
			props: {
				deployment
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onDestroy, onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'

	export let deployment

	const reloadInterval = 60 * 1000 // 1m

	let filter = {
		range: $page.url.searchParams.get('range') || '1h'
	}

	let chart = {
		cpuUsage: {
			el: null,
			chart: null
		},
		memory: {
			el: null,
			chart: null
		},
		requests: {
			el: null,
			chart: null
		},
		egress: {
			el: null,
			chart: null
		}
	}

	let reloadTimeout

	async function fetchMetrics (update = false) {
		clearTimeout(reloadTimeout)
		reloadTimeout = null

		try {
			const resp = await api.invoke('deployment.metrics', {
				project: deployment.project,
				location: deployment.location,
				name: deployment.name,
				timeRange: filter.range
			}, fetch)
			if (!resp.ok) {
				return
			}

			setChartSeries(chart.cpuUsage.chart, 'usage', resp.result.cpuUsage, update)
			setChartSeries(chart.memory.chart, 'usage', resp.result.memoryUsage, update)
			setChartSeries(chart.memory.chart, 'allocated', resp.result.memory, update)
			chart.requests.chart && setChartSeries(chart.requests.chart, '', resp.result.requests, update)
			setChartSeries(chart.egress.chart, '', resp.result.egress, update)
		} finally {
			clearTimeout(reloadTimeout) // prevent race condition
			reloadTimeout = setTimeout(() => fetchMetrics(true), reloadInterval)
		}
	}

	function initCharts () {
		initChart(chart.cpuUsage, 'vCPU (second)', 'second')
		initChart(chart.memory, 'Memory (bytes)', 'bytes')
		chart.requests.el && initChart(chart.requests, 'Requests (rps)')
		initChart(chart.egress, 'Egress (bytes)', 'bytes')
	}

	function initChart (it, title, format) {
		let yFormatter = null

		if (format === 'bytes') {
			const kib = 1024
			const mib = 1024 * kib
			const gib = 1024 * mib
			yFormatter = (v) => {
				if (v > gib) {
					return Highcharts.numberFormat(v / gib, 2) + "Gi"
				} else if (v > mib) {
					return Highcharts.numberFormat(v / mib, 2) + "Mi";
				}
				return Highcharts.numberFormat(v / kib, 2) + "Ki"
			}
		}

		it.chart = Highcharts.chart(it.el, {
			title: {
				text: title
			},
			xAxis: {
				type: 'datetime'
			},
			yAxis: {
				labels: {
					formatter () {
						if (!yFormatter) {
							return this.value
						}

						return yFormatter(this.value)
					}
				}
			},
			series: []
		})
	}

	function setChartSeries (chart, resourceType, lines, update) {
		if (!lines) {
			lines = []
		}

		let prefix = ''
		switch (resourceType) {
			case 'usage':
				prefix = 'Usage '
				break
			case 'allocated':
				prefix = 'Allocated '
				break
		}

		lines.forEach((l) => {
			const lineName = prefix + l.name
			const data = l.points.map((pt) => [pt[0] * 1000, +pt[1]])

			if (update) {
				const s = chart.series.find((it) => it.name === lineName)
				// already exists, update
				if (s) {
					s.update({ data }, false)
					return
				}
			}

			// not exists, add new series
			chart.addSeries({
				type: 'line',
				name: lineName,
				marker: {
					enabled: false
				},
				data,
			}, false)
		})

		chart.redraw()
	}

	onMount(() => {
		hc.init()
		initCharts()
		fetchMetrics()
	})

	onDestroy(() => {
		clearTimeout(reloadTimeout)
		chart.cpuUsage.chart?.destroy()
		chart.memory.chart?.destroy()
		chart.requests.chart?.destroy()
		chart.egress.chart?.destroy()
	})
</script>

<h6><strong>Metric</strong></h6>

<div class="_dp-g _gg-16px _jtfct-fst">
	<div class="moon-select">
		<select bind:value={filter.range} on:change={fetchMetrics}>
			<option value="1h">1 Hour</option>
			<option value="6h">6 Hours</option>
			<option value="12h">12 Hours</option>
			<option value="1d">1 Day</option>
			<option disabled>----------</option>
			<option value="1hagg">1 Hour (Aggregate)</option>
			<option value="6hagg">6 Hours (Aggregate)</option>
			<option value="12hagg">12 Hours (Aggregate)</option>
			<option value="1dagg">1 Day (Aggregate)</option>
			<option value="2dagg">2 Days (Aggregate)</option>
			<option value="7dagg">7 Days (Aggregate)</option>
			<option value="30dagg">30 Days (Aggregate)</option>
		</select>
	</div>
</div>

<div bind:this={chart.cpuUsage.el}></div>
<div bind:this={chart.memory.el}></div>
{#if deployment.type === 'WebService'}
	<div bind:this={chart.requests.el}></div>
{/if}
<div bind:this={chart.egress.el}></div>
