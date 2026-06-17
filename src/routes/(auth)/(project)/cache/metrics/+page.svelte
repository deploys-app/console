<script lang="ts">
	import type { PageData } from './$types'
	import type { LineSeries } from '$lib/charts/util'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'
	import { actionLabels, describeOverride, modeLabels, normalizeOverrides } from '$lib/cache/overrides'
	import { RANGE_SECONDS, RANGE_LABEL, BUCKET_SECONDS } from '$lib/metrics'
	import RangeSwitch from '$lib/components/RangeSwitch.svelte'
	import LineChart from '$lib/components/LineChart.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const managePath = $derived(`/cache/manage?project=${project}&location=${encodeURIComponent(location)}`)

	// Override id → its configured form, so the per-override table reads in human
	// terms rather than raw ids.
	const overrideMeta = $derived(new Map(
		normalizeOverrides(data.zone?.overrides).map((o) => [o.id, o])
	))

	// The three caching results, in chart stacking/legend order.
	const RESULT_ORDER: Api.CacheMetricsSeries['result'][] = ['applied', 'shadow', 'error']
	const RESULT_LABEL: Record<string, string> = { applied: 'Applied', shadow: 'Shadow', error: 'Error' }
	const RESULT_COLOR: Record<string, string> = {
		applied: 'hsl(var(--hsl-positive))',
		shadow: 'hsl(var(--hsl-content) / 0.45)',
		error: 'hsl(var(--hsl-negative))'
	}


	const initialRange = $page.url.searchParams.get('range')
	let range = $state(initialRange && RANGE_SECONDS[initialRange] ? initialRange : '1d')

	let loading = $state(true)
	let result = $state<Api.CacheMetricsResult | null>(null)
	// Anchor the time window to the moment of the latest fetch so the chart grid
	// and "as of" line agree.
	let fetchedAt = $state(Math.floor(Date.now() / 1000))

	let refreshTimer: ReturnType<typeof setTimeout> | undefined

	async function fetchMetrics () {
		loading = true
		try {
			const res = await api.invoke<Api.CacheMetricsResult>('cache.metrics', { project, location, timeRange: range }, fetch)
			if (!res.ok) {
				modal.error({ error: res.error })
				return
			}
			result = res.result ?? { series: [], total: 0 }
			fetchedAt = Math.floor(Date.now() / 1000)
		} finally {
			loading = false
			scheduleRefresh()
		}
	}

	// Live-refresh only short windows — minute-level polling is meaningless for a
	// 7d/30d view and just churns the chart.
	function scheduleRefresh () {
		clearTimeout(refreshTimer)
		if (RANGE_SECONDS[range] <= RANGE_SECONDS['1d']) {
			refreshTimer = setTimeout(fetchMetrics, 60 * 1000)
		}
	}

	function selectRange (r: string) {
		if (r === range) return
		range = r
		const u = new URL($page.url)
		u.searchParams.set('range', r)
		replaceState(u, {})
		result = null
		fetchMetrics()
	}

	onMount(() => {
		fetchMetrics()
		return () => clearTimeout(refreshTimer)
	})

	const total = $derived(result?.total ?? 0)

	// Totals per result, for the KPI tiles.
	const byResult = $derived.by(() => {
		const acc: Record<string, number> = { applied: 0, shadow: 0, error: 0 }
		for (const s of result?.series ?? []) {
			acc[s.result] = (acc[s.result] ?? 0) + s.total
		}
		return acc
	})

	const tiles = $derived([
		{ key: 'total', label: 'Total decisions', value: total },
		{ key: 'applied', label: 'Applied', value: byResult.applied },
		{ key: 'shadow', label: 'Shadow', value: byResult.shadow },
		{ key: 'error', label: 'Error', value: byResult.error }
	])

	const windowFrom = $derived(fetchedAt - RANGE_SECONDS[range])

	// Bucket every series' sparse points onto a shared grid, summed per result, so
	// the lines line up. Results with no traffic in the window are dropped.
	const chartSeries = $derived.by(() => {
		const bucket = BUCKET_SECONDS[range]
		const from = windowFrom
		const to = fetchedAt
		const n = Math.max(1, Math.ceil((to - from) / bucket))

		const grids: Record<string, number[]> = { applied: new Array(n).fill(0), shadow: new Array(n).fill(0), error: new Array(n).fill(0) }
		for (const s of result?.series ?? []) {
			const g = grids[s.result]
			if (!g) continue
			for (const [ts, v] of s.points ?? []) {
				const i = Math.floor((ts - from) / bucket)
				if (i >= 0 && i < n) g[i] += v
			}
		}

		const out: LineSeries[] = RESULT_ORDER
			.filter((res) => byResult[res] > 0)
			.map((res) => ({
				name: RESULT_LABEL[res],
				color: RESULT_COLOR[res],
				dashed: res === 'shadow',
				points: grids[res].map((v, i) => ({ x: (from + i * bucket) * 1000, y: v }))
			}))
		return out
	})

	// Rank overrides by decision volume. Each (override, action, result) series
	// collapses onto its override; the action of its largest series wins the badge.
	const topOverrides = $derived.by(() => {
		const byOverride: Record<string, { overrideId: string, total: number, action: Api.CacheAction, top: number }> = {}
		for (const s of result?.series ?? []) {
			const cur = byOverride[s.overrideId]
			if (cur) {
				cur.total += s.total
				if (s.total > cur.top) {
					cur.top = s.total
					cur.action = s.action
				}
			} else {
				byOverride[s.overrideId] = { overrideId: s.overrideId, total: s.total, action: s.action, top: s.total }
			}
		}
		return Object.values(byOverride)
			.filter((o) => o.total > 0)
			.sort((a, b) => b.total - a.total)
	})

	function share (v: number): number {
		return total > 0 ? v / total : 0
	}
	function pct (v: number): string {
		return total > 0 ? `${Math.round((v / total) * 100)}%` : '—'
	}

	const showSpinner = $derived(loading && !result)
	const isEmpty = $derived(!loading && total === 0)
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/cache?project=${project}`} class="link"><h6>Cache</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6 class="font-mono">{location}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Cache activity</strong></h4>
		<p class="page-sub">
			Cache decisions in <span class="font-mono">{location}</span> · {RANGE_LABEL[range]}
		</p>
	</div>
	<div class="head-actions">
		<RangeSwitch value={range} onselect={selectRange} />
		<a class="button is-variant-secondary is-icon-left" href={managePath}>
			<i class="fa-solid fa-sliders"></i>
			Manage overrides
		</a>
	</div>
</div>

<div class="stat-grid">
	{#each tiles as tile (tile.key)}
		<div class="stat-tile" data-accent={tile.key}>
			<div class="stat-head">
				{#if tile.key !== 'total'}<span class="dot"></span>{/if}
				{tile.label}
			</div>
			<div class="stat-value">
				{#if showSpinner}
					<span class="text-content/25"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
				{:else}
					{format.count(tile.value)}
				{/if}
			</div>
			<div class="stat-foot">
				{#if tile.key === 'total'}
					<span>across {topOverrides.length} {topOverrides.length === 1 ? 'override' : 'overrides'}</span>
				{:else}
					<span class="share-bar"><span style={`width:${share(tile.value) * 100}%`}></span></span>
					<span class="tabular-nums">{pct(tile.value)}</span>
				{/if}
			</div>
		</div>
	{/each}
</div>

<div class="panel is-level-300 chart-panel">
	<div class="panel-head">
		<h6><strong>Decisions over time</strong></h6>
		<div class="legend">
			{#each RESULT_ORDER as res (res)}
				<span class="legend-item" data-result={res}>
					<span class="legend-dot"></span>
					{RESULT_LABEL[res]}
				</span>
			{/each}
		</div>
	</div>

	<div class="chart-body">
		{#if showSpinner}
			<div class="chart-state text-content/40">
				<i class="fa-solid fa-spinner-third fa-spin text-2xl"></i>
			</div>
		{:else if isEmpty}
			<div class="chart-state">
				<i class="fa-solid fa-bolt empty-icon"></i>
				<p class="empty-title">No cache decisions in this window</p>
				<p class="empty-sub">No override has fired in the {RANGE_LABEL[range]}.</p>
			</div>
		{:else}
			<LineChart
				series={chartSeries}
				xType="time"
				xDomain={[windowFrom * 1000, fetchedAt * 1000]}
				height={320}
				formatY={(v) => format.count(v)}
				formatValue={(v) => v.toLocaleString()}
				legend />
		{/if}
	</div>
</div>

{#if !isEmpty}
	<div class="panel is-level-300">
		<div class="panel-head">
			<h6><strong>Top overrides</strong></h6>
			<span class="page-sub">by decision volume</span>
		</div>
		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Override</th>
						<th>Action</th>
						<th class="is-align-right">Decisions</th>
						<th class="share-col">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each topOverrides as override (override.overrideId)}
						{@const meta = overrideMeta.get(override.overrideId)}
						{@const action = meta?.action ?? override.action}
						<tr>
							<td>
								<div class="rule-cell">
									{#if meta?.description}
										<span class="rule-desc">{meta.description}</span>
									{/if}
									<span class="font-mono text-sm text-content/55">{override.overrideId}</span>
									{#if meta}
										<span class="text-sm text-content/55">{describeOverride(meta)}{meta.mode === 'shadow' ? ` · ${modeLabels.shadow}` : ''}</span>
									{/if}
								</div>
							</td>
							<td>
								<span class="act-badge" data-action={action}>{actionLabels[action] ?? action}</span>
							</td>
							<td class="is-align-right font-mono tabular-nums">{override.total.toLocaleString()}</td>
							<td class="share-col">
								<div class="row-share">
									<span class="share-bar" data-action={action}>
										<span style={`width:${share(override.total) * 100}%`}></span>
									</span>
									<span class="tabular-nums text-content/60">{pct(override.total)}</span>
								</div>
							</td>
						</tr>
					{/each}
					{#if showSpinner}
						<tr><td colspan="4" class="text-center text-content/40">
							<i class="fa-solid fa-spinner-third fa-spin"></i>
						</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<style>
	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Segmented time-range control. */
	/* KPI tiles — colored by the caching result. */
	.stat-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-bottom: 1rem;
	}

	@media (min-width: 1024px) {
		.stat-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.stat-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1rem 1.125rem;
		border-radius: 0.75rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
		overflow: hidden;
	}

	.stat-tile::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 3px;
		background: var(--accent, hsl(var(--hsl-content) / 0.2));
	}

	.stat-tile[data-accent='applied'] { --accent: hsl(var(--hsl-positive)); }
	.stat-tile[data-accent='shadow'] { --accent: hsl(var(--hsl-content) / 0.45); }
	.stat-tile[data-accent='error'] { --accent: hsl(var(--hsl-negative)); }

	.stat-tile[data-accent='total'] {
		background: linear-gradient(135deg, hsl(var(--hsl-primary) / 0.12) 0%, hsl(var(--hsl-accent) / 0.12) 100%);
		border-color: hsl(var(--hsl-primary) / 0.2);
	}

	.stat-tile[data-accent='total']::before {
		background: linear-gradient(hsl(var(--hsl-primary)), hsl(var(--hsl-accent)));
	}

	.stat-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.stat-head .dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--accent);
	}

	.stat-value {
		font-size: 1.9rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-content));
	}

	.stat-tile[data-accent='total'] .stat-value {
		color: hsl(var(--hsl-primary));
	}

	.stat-foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	/* Shared mini bar — fill color follows the row/tile result accent. */
	.share-bar {
		flex: 1;
		height: 0.3125rem;
		min-width: 2rem;
		border-radius: 9999px;
		background: hsl(var(--hsl-content) / 0.08);
		overflow: hidden;
	}

	.share-bar > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--accent, hsl(var(--hsl-primary)));
		transition: width var(--timing-normal) ease;
	}

	.stat-tile[data-accent='applied'] .share-bar > span { background: hsl(var(--hsl-positive)); }
	.stat-tile[data-accent='shadow'] .share-bar > span { background: hsl(var(--hsl-content) / 0.45); }
	.stat-tile[data-accent='error'] .share-bar > span { background: hsl(var(--hsl-negative)); }

	.share-bar[data-action='cache'] > span { background: hsl(var(--hsl-positive)); }
	.share-bar[data-action='bypass'] > span { background: hsl(var(--hsl-warning)); }

	/* Panels */
	.panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.chart-panel {
		margin-bottom: 1rem;
	}

	.chart-body {
		min-height: 320px;
	}

	.chart-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 320px;
		text-align: center;
	}

	.chart-state .empty-icon {
		font-size: 1.75rem;
		color: hsl(var(--hsl-positive) / 0.6);
	}

	.chart-state .empty-title {
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.8);
	}

	.chart-state .empty-sub {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
		max-width: 22rem;
	}

	/* Chart legend */
	.legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.legend-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 0.25rem;
	}

	.legend-item[data-result='applied'] .legend-dot { background: hsl(var(--hsl-positive)); }
	.legend-item[data-result='shadow'] .legend-dot { background: hsl(var(--hsl-content) / 0.45); }
	.legend-item[data-result='error'] .legend-dot { background: hsl(var(--hsl-negative)); }

	/* Top-overrides table */
	.rule-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.rule-desc {
		font-weight: 500;
	}

	.share-col {
		width: 30%;
		min-width: 9rem;
	}

	.row-share {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.75rem;
	}

	.act-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.act-badge[data-action='cache'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.act-badge[data-action='bypass'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.14);
	}
</style>
