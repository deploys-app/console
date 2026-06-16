<script>
	import { tick, untrack } from 'svelte'
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
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
		{ value: '1d', label: '1 Day' },
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
		// `range` is read untracked so the project-keyed effect below isn't also
		// triggered by range changes — those refresh via the Select's onchange.
		const range = untrack(() => filter.range)
		/** @type {Api.Response<Api.ProjectMetricsResult>} */
		const resp = await api.invoke('project.metrics', { project, timeRange: range }, fetch)
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

	// Persist the selected range in the URL so it survives reloads and is
	// shareable, then refetch. Mirrors the cache/WAF metrics pages.
	function selectRange () {
		const u = new URL($page.url)
		u.searchParams.set('range', filter.range)
		replaceState(u, {})
		fetchMetrics(true)
	}

	// Re-fetch whenever the active project changes. This component is reused
	// across project switches — same route, new `?project=` — so `onMount`
	// won't fire again. `fetchMetrics` reads `project` synchronously when
	// building the request, so the effect tracks it and re-runs on a project
	// switch; `range` is read untracked, so it doesn't double-fetch alongside
	// the Select's onchange.
	$effect(() => {
		fetchMetrics(true)
	})
</script>

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
	<Chart title="Replicas" unit="count" series={replica} range={filter.range} />
	<Chart title="Disk (bytes)" unit="bytes" series={disk} range={filter.range} />
	<Chart title="Static Storage (bytes)" unit="bytes" series={storage} range={filter.range} />
</div>
