<script>
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount, tick } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'

	const { data } = $props()

	const disk = $derived(data.disk)

	const rangeOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '6h', label: '6 Hours' },
		{ value: '12h', label: '12 Hours' },
		{ value: '1d', label: '1 Day' },
		{ value: '2d', label: '2 Days' },
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' }
	]

	const reloadInterval = 60 * 1000 // 1m

	const filter = $state({
		range: $page.url.searchParams.get('range') || '1h'
	})

	let chart = $state([])

	let reloadTimeout

	async function fetchMetrics (clear = false) {
		reloadTimeout && clearTimeout(reloadTimeout)
		reloadTimeout = null

		try {
			const resp = await api.invoke('disk.metrics', {
				project: disk.project,
				location: disk.location,
				name: disk.name,
				timeRange: filter.range
			}, fetch)
			if (!resp.ok) {
				return
			}

			if (clear) {
				chart = []
				await tick()
			}

			chart = [
				{ prefix: 'Usage', lines: resp.result.usage ?? [] },
				{ prefix: 'Size', lines: resp.result.size ?? [], dashStyle: 'LongDash', color: 'red' }
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

<div class="w-44 max-w-full">
	<Select
		bind:value={filter.range}
		options={rangeOptions}
		onchange={() => fetchMetrics(true)} />
</div>

<div class="grid gap-4 mt-4">
	<Chart title="Disk (bytes)" unit="bytes" series={chart} />
</div>
