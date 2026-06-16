<script>
	import { tick, untrack } from 'svelte'
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
		// `range` is read untracked so the project-keyed effect below isn't also
		// triggered by range changes — those refresh via the Select's onchange.
		const range = untrack(() => filter.range)
		/** @type {Api.Response<Api.UsageMetricsResult>} */
		const resp = await api.invoke(fn, { project, timeRange: range }, fetch)
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

	// Re-fetch whenever the active project (or feature fn) changes. This
	// component is reused across project switches — same route, new
	// `?project=` — so `onMount` won't fire again. `fetchMetrics` reads
	// `project`/`fn` synchronously when building the request, so the effect
	// tracks them and re-runs on a project switch; `range` is read untracked,
	// so it doesn't double-fetch alongside the Select's onchange.
	$effect(() => {
		fetchMetrics(true)
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
