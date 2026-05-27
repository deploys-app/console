<script>
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount, tick } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'

	const { data } = $props()

	const rangeOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '6h', label: '6 Hours' },
		{ value: '12h', label: '12 Hours' },
		{ value: '1d', label: '1 Day' },
		{ separator: true },
		{ value: '1hagg', label: '1 Hour (Aggregate)' },
		{ value: '6hagg', label: '6 Hours (Aggregate)' },
		{ value: '12hagg', label: '12 Hours (Aggregate)' },
		{ value: '1dagg', label: '1 Day (Aggregate)' },
		{ value: '2dagg', label: '2 Days (Aggregate)' },
		{ value: '7dagg', label: '7 Days (Aggregate)' },
		{ value: '30dagg', label: '30 Days (Aggregate)' }
	]

	const deployment = $derived(data.deployment)

	const reloadInterval = 60 * 1000 // 1m

	const filter = $state({
		range: $page.url.searchParams.get('range') || '1hagg'
	})

	let cpu = $state([])
	let memory = $state([])
	let request = $state([])
	let egress = $state([])

	let reloadTimeout

	async function fetchMetrics (clear = false) {
		reloadTimeout && clearTimeout(reloadTimeout)
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

			if (clear) {
				cpu = []
				memory = []
				request = []
				egress = []
				await tick()
			}

			cpu = [
				{ prefix: 'Usage', lines: resp.result.cpuUsage ?? [] },
				{ prefix: 'Limit', lines: resp.result.cpuLimit ?? [], dashStyle: 'LongDash', color: 'red' }
			]
			memory = [
				{ prefix: 'Usage', lines: resp.result.memoryUsage ?? [] },
				{ prefix: 'Allocated', lines: resp.result.memory ?? [] },
				{ prefix: 'Limit', lines: resp.result.memoryLimit ?? [], dashStyle: 'LongDash', color: 'red' }
			]
			if (deployment.type === 'WebService') {
				request = [
					{ prefix: 'Requests', lines: resp.result.requests ?? [] }
				]
			}
			egress = [
				{ prefix: 'Egress', lines: resp.result.egress ?? [] }
			]
		} finally {
			reloadTimeout && clearTimeout(reloadTimeout)
			reloadTimeout = setTimeout(fetchMetrics, reloadInterval)
		}
	}

	onMount(() => {
		fetchMetrics()

		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
		}
	})
</script>

<h6><strong>Metric</strong></h6>

<div class="grid gap-4 justify-start">
	<Select
		bind:value={filter.range}
		options={rangeOptions}
		onchange={() => fetchMetrics(true)} />
</div>

<div class="grid gap-4 mt-4 lg:grid-cols-2">
	<Chart title="vCPU (second)" unit="seconds" series={cpu} range={filter.range} />
	<Chart title="Memory (bytes)" unit="bytes" series={memory} range={filter.range} />
	{#if deployment.type === 'WebService'}
		<Chart title="Request (rps)" unit="rps" series={request} range={filter.range} />
	{/if}
	<Chart title="Egress (bytes)" unit="bytes" series={egress} range={filter.range} />
</div>
