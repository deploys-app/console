<script>
	import { onMount, tick } from 'svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'

	/**
	 * Daily project-level usage charts read from the project.metrics RPC. CPU,
	 * memory, disk and replicas are per-day average levels; egress is the day's
	 * total bytes (pod + cache + WAF); static storage is the day's gauge.
	 *
	 * @typedef {Object} Props
	 * @property {string} project
	 */

	/** @type {Props} */
	const { project } = $props()

	const rangeOptions = [
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' },
		{ value: '90d', label: '90 Days' }
	]

	const filter = $state({
		range: $page.url.searchParams.get('range') || '30d'
	})

	let cpu = $state([])
	let memory = $state([])
	let egress = $state([])
	let replica = $state([])
	let disk = $state([])
	let storage = $state([])

	async function fetchMetrics (clear = false) {
		/** @type {Api.Response<Api.ProjectMetricsResult>} */
		const resp = await api.invoke('project.metrics', { project, timeRange: filter.range }, fetch)
		if (!resp.ok) {
			return
		}

		if (clear) {
			cpu = []
			memory = []
			egress = []
			replica = []
			disk = []
			storage = []
			await tick()
		}

		cpu = [{ prefix: 'CPU', lines: resp.result.cpuUsage ?? [] }]
		memory = [{ prefix: 'Memory', lines: resp.result.memory ?? [] }]
		egress = [{ prefix: 'Egress', lines: resp.result.egress ?? [] }]
		replica = [{ prefix: 'Replicas', lines: resp.result.replica ?? [] }]
		disk = [{ prefix: 'Disk', lines: resp.result.disk ?? [] }]
		storage = [{ prefix: 'Storage', lines: resp.result.staticStorage ?? [] }]
	}

	onMount(() => {
		fetchMetrics()
	})
</script>

<div class="w-44 max-w-full">
	<Select
		bind:value={filter.range}
		options={rangeOptions}
		onchange={() => fetchMetrics(true)} />
</div>

<div class="grid gap-4 mt-4 lg:grid-cols-2">
	<Chart title="CPU (vCPU)" unit="count" series={cpu} range={filter.range} />
	<Chart title="Memory (bytes)" unit="bytes" series={memory} range={filter.range} />
	<Chart title="Egress (bytes)" unit="bytes" series={egress} range={filter.range} />
	<Chart title="Replicas" unit="count" series={replica} range={filter.range} />
	<Chart title="Disk (bytes)" unit="bytes" series={disk} range={filter.range} />
	<Chart title="Static Storage (bytes)" unit="bytes" series={storage} range={filter.range} />
</div>
