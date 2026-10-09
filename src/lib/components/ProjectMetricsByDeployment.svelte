<script lang="ts">
	import { tick, untrack } from 'svelte'
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
	import api from '$lib/api'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'
	import type { MetricSeries } from '$lib/charts/util'

	/**
	 * Daily per-deployment charts from project.metricsByDeployment. The samples
	 * already live on each deployment (30-day retention), so this view does not
	 * need a new collector or usage table. CPU and memory are a day's average
	 * summed across pods; egress and requests are daily totals.
	 */

	interface Props {
		project: string
	}

	const { project }: Props = $props()

	const rangeOptions = [
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' }
	]

	const requested = $page.url.searchParams.get('range')
	const filter = $state({
		range: requested === '7d' || requested === '30d' ? requested : '30d'
	})

	let cpu = $state<MetricSeries[]>([])
	let memory = $state<MetricSeries[]>([])
	let egress = $state<MetricSeries[]>([])
	let requests = $state<MetricSeries[]>([])
	let storage = $state<MetricSeries[]>([])

	function seriesOf (lines: Api.UsageMetricsLine[] | null | undefined): MetricSeries[] {
		return (lines ?? []).map((line) => ({
			prefix: line.name,
			lines: [{ name: line.name, points: line.points ?? [] }]
		}))
	}

	async function fetchMetrics (clear = false) {
		const range = untrack(() => filter.range)
		const resp: Api.Response<Api.ProjectMetricsByDeploymentResult> = await api.invoke(
			'project.metricsByDeployment',
			{ project, timeRange: range },
			fetch
		)
		if (!resp.ok) {
			return
		}

		if (clear) {
			cpu = []
			memory = []
			egress = []
			requests = []
			storage = []
			await tick()
		}

		cpu = seriesOf(resp.result.cpuUsage)
		memory = seriesOf(resp.result.memory)
		egress = seriesOf(resp.result.egress)
		requests = seriesOf(resp.result.requests)
		storage = seriesOf(resp.result.staticStorage)
	}

	function selectRange () {
		const u = new URL($page.url)
		u.searchParams.set('range', filter.range)
		replaceState(u, {})
		fetchMetrics(true)
	}

	$effect(() => {
		fetchMetrics(true)
	})
</script>

<p class="text-sm text-content/60 mb-4">
	CPU and memory are each day's average, summed across a deployment's pods. Egress and requests are daily totals.
	Samples are kept for 30 days. Cache egress, replicas, and disk are not recorded per deployment.
</p>

<div class="w-44 max-w-full">
	<Select
		bind:value={filter.range}
		options={rangeOptions}
		onchange={selectRange} />
</div>

<div class="grid gap-4 mt-4 lg:grid-cols-2">
	<Chart title="CPU (vCPU)" unit="count" series={cpu} range={filter.range} />
	<Chart title="Memory (bytes)" unit="bytes" series={memory} range={filter.range} />
	<Chart title="Egress (bytes)" unit="bytes" series={egress} range={filter.range} />
	<Chart title="Requests" unit="count" series={requests} range={filter.range} />
	<Chart title="Static Storage (bytes)" unit="bytes" series={storage} range={filter.range} />
</div>
