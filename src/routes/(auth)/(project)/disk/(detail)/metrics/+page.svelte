<script lang="ts">
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount, tick, untrack } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'
	import Select from '$lib/components/Select.svelte'
	import type { PageData } from './$types'
	import type { MetricSeries } from '$lib/charts/util'

	const { data }: { data: PageData } = $props()

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

	let chart = $state<MetricSeries[]>([])

	let reloadTimeout: ReturnType<typeof setTimeout> | null = null

	async function fetchMetrics (clear = false) {
		reloadTimeout && clearTimeout(reloadTimeout)
		reloadTimeout = null

		// `range` is read untracked so the disk-keyed effect below isn't also
		// triggered by range changes — those refetch via the Select's onchange.
		const range = untrack(() => filter.range)

		try {
			const resp = await api.invoke<Api.DiskMetricsResult>('disk.metrics', {
				project: disk.project,
				location: disk.location,
				name: disk.name,
				timeRange: range
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
		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
		}
	})

	// Refetch the chart when the disk identity changes. A project switch unmounts
	// this (detail) page (overrideRedirect '/disk'), but the disk list links here
	// per disk, so /disk/metrics?name=A -> ?name=B (or a ?location= change) reuses
	// this component WITHOUT remounting — an onMount-only fetch would leave disk
	// A's Usage/Size series up until the next ~60s reload tick. fetchMetrics reads
	// disk.project/location/name synchronously, so the effect tracks them (range
	// is untracked; the Select refetches on a range change). clearFirst blanks the
	// chart during the swap.
	$effect(() => {
		fetchMetrics(true)
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
