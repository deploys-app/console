<script lang="ts">
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import Sparkline from '$lib/components/Sparkline.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import CacheResultChart from '$lib/components/CacheResultChart.svelte'
	import RangeSwitch from '$lib/components/RangeSwitch.svelte'
	import { RANGE_SECONDS, RANGE_LABEL } from '$lib/metrics'
	import { formatBytes, formatNumber } from '$lib/charts/util'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const zones = $derived(data.zones)
	const error = $derived(data.error)

	const hasPending = $derived(zones.some((z: Api.CacheZone) => z.status === 'pending'))

	// While any zone is still being applied/removed by the deployer, poll
	// cache.list so the spinner resolves to its settled state on its own. Mirrors
	// the WAF list polling pattern (api.intervalInvalidate in onMount).
	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPending) return
		await api.invalidate('cache.list')
	}, 3000))

	// Last 24h of cache decision activity per location, shown as an inline
	// sparkline + total. Fetched client-side (one cache.metrics per zone, in
	// parallel) so the table renders immediately and the charts fill in.
	interface Metrics {
		loading: boolean
		total: number
		points: [number, number][]
	}
	const metrics = $state<Record<string, Metrics>>({})

	// Fixed 24h x-domain so bars sit at the right time-of-day even when the zone
	// only has a few active minutes.
	const to = Math.floor(Date.now() / 1000)
	const from = to - 24 * 60 * 60

	onMount(() => {
		Promise.all(zones.map(async (z: Api.CacheZone) => {
			metrics[z.location] = { loading: true, total: 0, points: [] }

			const res = await api.invoke<Api.CacheMetricsResult>('cache.metrics',
				{ project, location: z.location, timeRange: '1d' }, fetch)

			metrics[z.location] = {
				loading: false,
				total: res.result?.total ?? 0,
				points: aggregate(res.result?.series ?? [])
			}
		}))
	})

	// Collapse the per-(override, action, result) series into one total-decisions
	// line: sum every series' value at each timestamp, then sort by time.
	function aggregate (series: Api.CacheMetricsSeries[]): [number, number][] {
		const byTs: Record<number, number> = {}
		for (const s of series) {
			for (const [ts, v] of s.points ?? []) {
				byTs[ts] = (byTs[ts] ?? 0) + v
			}
		}
		return Object.entries(byTs)
			.map(([ts, v]) => ([Number(ts), v] as [number, number]))
			.sort((a, b) => a[0] - b[0])
	}

	// Project-wide edge response-cache outcomes (hit/miss/stale/bypass), summed
	// across every location, as a full-width stacked chart. The Requests/Bandwidth
	// toggle reuses the same chart with a different value series + formatter.
	const RESULT_ORDER = ['HIT', 'STALE', 'MISS', 'BYPASS'] as const // bottom-to-top
	const RESULT_LABEL: Record<string, string> = { HIT: 'Hit', STALE: 'Stale', MISS: 'Miss', BYPASS: 'Bypass' }
	const RESULT_COLOR: Record<string, string> = {
		HIT: 'hsl(var(--hsl-positive))',
		STALE: 'hsl(var(--hsl-warning))',
		MISS: 'hsl(var(--hsl-primary))',
		BYPASS: 'hsl(var(--hsl-content) / 0.35)'
	}

	let range = $state('1d')
	let view = $state<'requests' | 'bandwidth'>('requests')
	let resultMetrics = $state<Api.CacheResultMetricsResult | null>(null)
	let resultLoading = $state(true)
	let resultFetchedAt = $state(Math.floor(Date.now() / 1000))

	async function fetchResultMetrics () {
		resultLoading = true
		const res = await api.invoke<Api.CacheResultMetricsResult>('cache.resultMetrics',
			{ project, timeRange: range }, fetch)
		resultFetchedAt = Math.floor(Date.now() / 1000)
		resultMetrics = res.ok ? res.result : { series: [] }
		resultLoading = false
	}

	onMount(fetchResultMetrics)

	function selectRange (v: string) {
		if (v === range) return
		range = v
		fetchResultMetrics()
	}

	const seriesByResult = $derived(new Map((resultMetrics?.series ?? []).map((s) => [s.result, s])))

	const chartSeries = $derived(RESULT_ORDER.map((result) => {
		const s = seriesByResult.get(result)
		const pts = (view === 'requests' ? s?.requests : s?.bytes) ?? []
		return {
			result,
			name: RESULT_LABEL[result],
			color: RESULT_COLOR[result],
			data: pts.map(([ts, v]) => [ts * 1000, v] as [number, number])
		}
	}))

	const fmtY = $derived(view === 'bandwidth' ? formatBytes : formatNumber)
	const chartFrom = $derived((resultFetchedAt - (RANGE_SECONDS[range] ?? 86400)) * 1000)
	const chartTo = $derived(resultFetchedAt * 1000)

	// Cache hit ratio for the active view: cache-served (HIT + STALE) over all
	// outcomes. STALE counts as served-from-cache (the body comes from the store).
	const ratio = $derived.by(() => {
		let served = 0
		let all = 0
		for (const s of resultMetrics?.series ?? []) {
			const v = view === 'requests' ? (s.requestsTotal ?? 0) : (s.bytesTotal ?? 0)
			all += v
			if (s.result === 'HIT' || s.result === 'STALE') served += v
		}
		return all > 0 ? served / all : 0
	})

	const hasResultData = $derived((resultMetrics?.series ?? []).some((s) =>
		(view === 'requests' ? (s.requestsTotal ?? 0) : (s.bytesTotal ?? 0)) > 0))
</script>

<div class="page-head">
	<div>
		<h4><strong>Cache</strong></h4>
		<p class="page-sub">
			{zones.length} {zones.length === 1 ? 'cache zone' : 'cache zones'}
		</p>
	</div>
	<GuardedButton permission="cache.set" class="button is-icon-left" href={`/cache/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Configure cache
	</GuardedButton>
</div>

<div class="panel is-level-300 cache-perf">
	<div class="perf-head">
		<div>
			<h6 class="perf-title"><strong>Cache performance</strong></h6>
			<p class="perf-sub">Edge cache outcomes across all locations · {RANGE_LABEL[range] ?? range}</p>
		</div>
		<div class="perf-controls">
			<div class="seg" role="group" aria-label="Metric">
				<button type="button" class="seg-btn" class:is-active={view === 'requests'}
					aria-pressed={view === 'requests'} onclick={() => (view = 'requests')}>Requests</button>
				<button type="button" class="seg-btn" class:is-active={view === 'bandwidth'}
					aria-pressed={view === 'bandwidth'} onclick={() => (view = 'bandwidth')}>Bandwidth</button>
			</div>
			<RangeSwitch value={range} onselect={selectRange} />
		</div>
	</div>

	{#if resultLoading}
		<div class="perf-empty"><i class="fa-solid fa-spinner-third fa-spin"></i></div>
	{:else if !hasResultData}
		<div class="perf-empty">No cache activity in the {RANGE_LABEL[range] ?? range}.</div>
	{:else}
		<div class="legend">
			{#each RESULT_ORDER as r (r)}
				<span class="legend-item">
					<span class="legend-dot" style:background={RESULT_COLOR[r]}></span>{RESULT_LABEL[r]}
				</span>
			{/each}
			<span class="legend-ratio">Hit ratio <strong>{(ratio * 100).toFixed(1)}%</strong></span>
		</div>
		<CacheResultChart series={chartSeries} from={chartFrom} to={chartTo} formatY={fmtY} />
	{/if}
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Location</th>
					<th>Status</th>
					<th>Description</th>
					<th>Overrides</th>
					<th>Decisions (24h)</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each zones as zone (zone.location)}
					<tr>
						<td>
							<a href={`/cache/metrics?project=${project}&location=${encodeURIComponent(zone.location)}`} class="link font-mono">{zone.location}</a>
						</td>
						<td>
							{#if zone.status === 'pending'}
								<span class="inline-flex items-center gap-2 text-content/70">
									<i class="fa-solid fa-spinner-third fa-spin"></i>
									{zone.action === 'delete' ? 'Removing' : 'Deploying'}
								</span>
							{:else if zone.status === 'error'}
								<span class="inline-flex items-center gap-2 text-negative/80">
									<i class="fa-solid fa-times"></i>
									Error
								</span>
							{:else}
								<span class="inline-flex items-center gap-2 text-positive/80">
									<i class="fa-solid fa-check-circle"></i>
									Active
								</span>
							{/if}
						</td>
						<td>
							{#if zone.description}
								{zone.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{zone.overrides?.length ?? 0}</td>
						<td>
							<!-- Reserve the loaded size in every state so the row/column keeps
							     its dimensions while the async sparkline fills in (no layout shift). -->
							<div class="matches-cell">
								{#if metrics[zone.location]?.loading}
									<span class="text-content/30"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
								{:else if (metrics[zone.location]?.total ?? 0) > 0}
									<a class="matches-link flex items-center gap-3"
										href={`/cache/metrics?project=${project}&location=${encodeURIComponent(zone.location)}`}
										title={`${metrics[zone.location].total.toLocaleString()} cache decisions in the last 24h — view metrics`}>
										<span class="font-mono text-sm tabular-nums">
											{format.count(metrics[zone.location].total)}
										</span>
										<Sparkline points={metrics[zone.location].points} {from} {to} />
									</a>
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="button is-variant-secondary is-size-small"
									href={`/cache/manage?project=${project}&location=${encodeURIComponent(zone.location)}`}>
									Manage
								</a>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={6}
					list={zones}
					icon="fa-bolt"
					message="No cache zones yet"
					hint="Configure cache to start overriding edge caching in a location."
					ctaLabel="Configure cache"
					ctaHref={`/cache/create?project=${project}`}
					{error} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	/* Hold a fixed box across the loading / loaded / empty states: min-height
	   matches the Sparkline's height (28px) and min-width its count + chart, so
	   the row doesn't grow taller or the column wider when the chart loads. */
	.matches-cell {
		display: flex;
		align-items: center;
		min-height: 28px;
		min-width: 10rem;
	}

	/* The decisions total + sparkline doubles as a shortcut into the metrics view. */
	.matches-link {
		width: fit-content;
		color: inherit;
		border-radius: 0.375rem;
		transition: color var(--timing-fastest) ease;
	}

	.matches-link:hover {
		color: hsl(var(--hsl-primary));
	}

	.cache-perf {
		margin-bottom: 1rem;
	}

	.perf-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}

	.perf-title {
		color: hsl(var(--hsl-content) / 0.85);
	}

	.perf-sub {
		margin-top: 0.125rem;
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.perf-controls {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	/* Segmented Requests|Bandwidth toggle — mirrors RangeSwitch styling. */
	.seg {
		display: inline-flex;
		padding: 0.1875rem;
		gap: 0.125rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.seg-btn {
		padding: 0.3125rem 0.6875rem;
		border-radius: 0.4375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-fastest) ease, background var(--timing-fastest) ease;
	}

	.seg-btn:hover {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.seg-btn.is-active {
		color: hsl(var(--hsl-primary-content));
		background: hsl(var(--hsl-primary));
	}

	.perf-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 320px;
		color: hsl(var(--hsl-content) / 0.45);
		font-size: 0.875rem;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.legend-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.legend-ratio {
		margin-left: auto;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.legend-ratio strong {
		color: hsl(var(--hsl-content));
		font-variant-numeric: tabular-nums;
	}
</style>
