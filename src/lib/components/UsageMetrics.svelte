<script>
	import { onMount, tick } from 'svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'

	/**
	 * Daily egress + storage usage charts for a project-level feature (Dropbox,
	 * Registry). Data comes from a `*.metrics` RPC returning `{ egress, storage }`
	 * series of `[unixSeconds, value]` points, one point per day.
	 *
	 * @typedef {Object} Props
	 * @property {string} project
	 * @property {string} fn         api function, e.g. 'dropbox.metrics'
	 */

	/** @type {Props} */
	const { project, fn } = $props()

	const rangeOptions = [
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' },
		{ value: '90d', label: '90 Days' }
	]

	const filter = $state({
		range: $page.url.searchParams.get('range') || '30d'
	})

	let egress = $state([])
	let storage = $state([])

	async function fetchMetrics (clear = false) {
		/** @type {Api.Response<Api.UsageMetricsResult>} */
		const resp = await api.invoke(fn, { project, timeRange: filter.range }, fetch)
		if (!resp.ok) {
			return
		}

		if (clear) {
			egress = []
			storage = []
			await tick()
		}

		egress = [{ prefix: 'Egress', lines: resp.result.egress ?? [] }]
		storage = [{ prefix: 'Storage', lines: resp.result.storage ?? [] }]
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
	<Chart title="Egress (bytes)" unit="bytes" series={egress} range={filter.range} />
	<Chart title="Storage (bytes)" unit="bytes" series={storage} range={filter.range} />
</div>
