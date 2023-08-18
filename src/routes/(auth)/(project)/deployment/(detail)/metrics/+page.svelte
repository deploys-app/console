<script>
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount, tick } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'

	export let data

	$: deployment = data.deployment

	const reloadInterval = 60 * 1000 // 1m

	const filter = {
		range: $page.url.searchParams.get('range') || '1h'
	}

	let cpu = []
	let memory = []
	let request = []
	let egress = []

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
				{ prefix: 'Limit', lines: resp.result.cpuLimit ?? [] }
			]
			memory = [
				{ prefix: 'Usage', lines: resp.result.memoryUsage ?? [] },
				{ prefix: 'Allocated', lines: resp.result.memory ?? [] },
				{ prefix: 'Limit', lines: resp.result.memoryLimit ?? [] }
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

<div class="_dp-g _g-6 _jtfct-fst">
	<div class="nm-select">
		<select bind:value={filter.range} on:change={() => fetchMetrics(true)}>
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

<Chart title="vCPU (second)" unit="seconds" series={cpu} />
<Chart title="Memory (bytes)" unit="bytes" series={memory} />
{#if deployment.type === 'WebService'}
	<Chart title="Request (rps)" unit="rps" series={request} />
{/if}
<Chart title="Egress (bytes)" unit="bytes" series={egress} />
