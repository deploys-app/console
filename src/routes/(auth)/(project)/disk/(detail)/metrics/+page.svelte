<script>
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount, tick } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'

	export let data

	$: disk = data.disk

	const reloadInterval = 60 * 1000 // 1m

	const filter = {
		range: $page.url.searchParams.get('range') || '1h'
	}

	let chart = []

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

<div class="_dp-g _g-6 _jtfct-fst">
	<div class="nm-select">
		<select bind:value={filter.range} on:change={() => fetchMetrics(true)}>
			<option value="1h">1 Hour</option>
			<option value="6h">6 Hours</option>
			<option value="12h">12 Hours</option>
			<option value="1d">1 Day</option>
			<option value="2d">2 Days</option>
			<option value="7d">7 Days</option>
			<option value="30d">30 Days</option>
		</select>
	</div>
</div>

<Chart title="Disk (bytes)" unit="bytes" series={chart} />
