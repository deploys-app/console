<script>
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'
	import { actionLabels } from '$lib/waf/rules'
	import { describeKey, modeLabels } from '$lib/waf/limits'
	import WafActivityChart from '$lib/components/WafActivityChart.svelte'
	import LineChart from '$lib/components/LineChart.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const managePath = $derived(`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`)

	// Rule id → its configured description/action, so the top-rules table reads
	// in human terms rather than raw ids.
	const ruleMeta = $derived(new Map(
		(data.zone?.rules ?? []).map((/** @type {Api.WafRule} */ r) => [r.id, r])
	))

	// Configured limits drive the rate-limit section: no limits, no section.
	const limits = $derived(/** @type {Api.WafLimit[]} */ (data.zone?.limits ?? []))
	const hasLimits = $derived(limits.length > 0)

	// Stacks render block on top of log on top of allow — most-severe last so it
	// sits at the top of the column.
	/** @type {Api.WafAction[]} */
	const ACTION_ORDER = ['allow', 'log', 'block']

	const RANGE_OPTIONS = [
		{ value: '1h', label: '1H' },
		{ value: '6h', label: '6H' },
		{ value: '12h', label: '12H' },
		{ value: '1d', label: '24H' },
		{ value: '7d', label: '7D' },
		{ value: '30d', label: '30D' }
	]
	/** @type {Record<string, number>} */
	const RANGE_SECONDS = { '1h': 3600, '6h': 21600, '12h': 43200, '1d': 86400, '7d': 604800, '30d': 2592000 }
	/** @type {Record<string, string>} */
	const RANGE_LABEL = {
		'1h': 'last hour',
		'6h': 'last 6 hours',
		'12h': 'last 12 hours',
		'1d': 'last 24 hours',
		'7d': 'last 7 days',
		'30d': 'last 30 days'
	}
	// Bucket width per range — kept around 48–72 columns so bars stay legible.
	/** @type {Record<string, number>} */
	const BUCKET_SECONDS = { '1h': 60, '6h': 300, '12h': 600, '1d': 1800, '7d': 10800, '30d': 43200 }

	const initialRange = $page.url.searchParams.get('range')
	let range = $state(initialRange && RANGE_SECONDS[initialRange] ? initialRange : '1d')

	let loading = $state(true)
	let result = $state(/** @type {Api.WafMetricsResult | null} */ (null))
	let limitResult = $state(/** @type {Api.WafLimitMetricsResult | null} */ (null))
	// Anchor the time window to the moment of the latest fetch so the chart grid
	// and "as of" line agree.
	let fetchedAt = $state(Math.floor(Date.now() / 1000))

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let refreshTimer

	async function fetchMetrics () {
		loading = true
		try {
			const args = { project, location, timeRange: range }
			const [res, limitRes] = await Promise.all([
				/** @type {Promise<Api.Response<Api.WafMetricsResult>>} */ (api.invoke('waf.metrics', args, fetch)),
				hasLimits
					? /** @type {Promise<Api.Response<Api.WafLimitMetricsResult>>} */ (api.invoke('waf.limitMetrics', args, fetch))
					: Promise.resolve(/** @type {Api.Response<Api.WafLimitMetricsResult>} */ ({ ok: true, result: { series: [], total: 0 } }))
			])
			if (!res.ok) {
				modal.error({ error: res.error })
				return
			}
			result = res.result ?? { series: [], total: 0 }
			limitResult = (limitRes.ok ? limitRes.result : null) ?? { series: [], total: 0 }
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

	/** @param {string} r */
	function selectRange (r) {
		if (r === range) return
		range = r
		const u = new URL($page.url)
		u.searchParams.set('range', r)
		replaceState(u, {})
		result = null
		limitResult = null
		fetchMetrics()
	}

	onMount(() => {
		fetchMetrics()
		return () => clearTimeout(refreshTimer)
	})

	const total = $derived(result?.total ?? 0)

	// Totals per action, for the KPI tiles.
	const byAction = $derived.by(() => {
		/** @type {Record<Api.WafAction, number>} */
		const acc = { block: 0, log: 0, allow: 0 }
		for (const s of result?.series ?? []) {
			acc[s.action] = (acc[s.action] ?? 0) + s.total
		}
		return acc
	})

	const tiles = $derived([
		{ key: 'total', label: 'Total matches', value: total },
		{ key: 'block', label: 'Blocked', value: byAction.block },
		{ key: 'log', label: 'Logged', value: byAction.log },
		{ key: 'allow', label: 'Allowed', value: byAction.allow }
	])

	const windowFrom = $derived(fetchedAt - RANGE_SECONDS[range])

	// Bucket every series' sparse points onto a shared grid, summed per action,
	// so the stacked columns line up. Actions with no traffic in the window are
	// dropped from the chart.
	const chartSeries = $derived.by(() => {
		const bucket = BUCKET_SECONDS[range]
		const from = windowFrom
		const to = fetchedAt
		const n = Math.max(1, Math.ceil((to - from) / bucket))

		/** @type {Record<Api.WafAction, number[]>} */
		const grids = { block: new Array(n).fill(0), log: new Array(n).fill(0), allow: new Array(n).fill(0) }
		for (const s of result?.series ?? []) {
			const g = grids[s.action]
			if (!g) continue
			for (const [ts, v] of s.points ?? []) {
				const i = Math.floor((ts - from) / bucket)
				if (i >= 0 && i < n) g[i] += v
			}
		}

		return ACTION_ORDER
			.filter((action) => byAction[action] > 0)
			.map((action) => ({
				action,
				name: actionLabels[action] ?? action,
				/** @type {[number, number][]} */
				data: grids[action].map((v, i) => [(from + i * bucket) * 1000, v])
			}))
	})

	// Rank rules by match volume. Each (rule, action) series collapses onto its
	// rule; the action of its largest series wins the badge.
	const topRules = $derived.by(() => {
		/** @type {Record<string, { ruleId: string, total: number, action: Api.WafAction, top: number }>} */
		const byRule = {}
		for (const s of result?.series ?? []) {
			const cur = byRule[s.ruleId]
			if (cur) {
				cur.total += s.total
				if (s.total > cur.top) {
					cur.top = s.total
					cur.action = s.action
				}
			} else {
				byRule[s.ruleId] = { ruleId: s.ruleId, total: s.total, action: s.action, top: s.total }
			}
		}
		return Object.values(byRule)
			.filter((r) => r.total > 0)
			.sort((a, b) => b.total - a.total)
	})

	/** @param {number} v */
	function share (v) {
		return total > 0 ? v / total : 0
	}
	/** @param {number} v */
	function pct (v) {
		return total > 0 ? `${Math.round((v / total) * 100)}%` : '—'
	}

	// Per-limit (allowed, limited) bucket counts, joined from the sparse series.
	const limitBuckets = $derived.by(() => {
		/** @type {Record<string, { allowed: Record<number, number>, limited: Record<number, number> }>} */
		const byLimit = {}
		for (const s of limitResult?.series ?? []) {
			const entry = byLimit[s.limitId] ??= { allowed: {}, limited: {} }
			const m = entry[s.result]
			if (!m) continue
			for (const [ts, v] of s.points ?? []) {
				m[ts] = (m[ts] ?? 0) + v
			}
		}
		return byLimit
	})

	// One share line per configured limit: limited / (allowed + limited) as a
	// percentage, over the union of that limit's bucket timestamps. A missing
	// series counts as 0, so a bucket with only limited traffic reads 100%.
	const limitShareSeries = $derived.by(() => {
		/** @type {import('$lib/charts/util').LineSeries[]} */
		const out = []
		for (const limit of limits) {
			const entry = limitBuckets[limit.id]
			if (!entry) continue
			const xs = [...new Set([...Object.keys(entry.allowed), ...Object.keys(entry.limited)])]
				.map(Number)
				.sort((a, b) => a - b)
			if (!xs.length) continue
			const name = limit.description || limit.id
			out.push({
				name: limit.mode === 'shadow' ? `${name} · shadow` : name,
				dashed: limit.mode === 'shadow',
				points: xs.map((ts) => {
					const allowed = entry.allowed[ts] ?? 0
					const limited = entry.limited[ts] ?? 0
					const t = allowed + limited
					return { x: ts * 1000, y: t > 0 ? (limited / t) * 100 : 0 }
				})
			})
		}
		return out
	})

	// Summary rows — every configured limit gets one, with — when it saw no
	// traffic in the window.
	const limitRows = $derived(limits.map((limit) => {
		const entry = limitBuckets[limit.id]
		const sum = (/** @type {Record<number, number> | undefined} */ m) =>
			Object.values(m ?? {}).reduce((acc, v) => acc + v, 0)
		const allowed = sum(entry?.allowed)
		const limited = sum(entry?.limited)
		const traffic = allowed + limited
		return { limit, allowed, limited, traffic, share: traffic > 0 ? (limited / traffic) * 100 : null }
	}))

	/** @param {number} v */
	function sharePct (v) {
		return `${v >= 10 ? v.toFixed(1) : v.toFixed(2)}%`
	}

	const showSpinner = $derived(loading && !result)
	const isEmpty = $derived(!loading && total === 0)
	const limitSpinner = $derived(loading && !limitResult)
	const limitEmpty = $derived(!limitSpinner && limitShareSeries.length === 0)
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6 class="font-mono">{location}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Firewall activity</strong></h4>
		<p class="page-sub">
			Matches in <span class="font-mono">{location}</span> · {RANGE_LABEL[range]}
		</p>
	</div>
	<div class="head-actions">
		<div class="range-switch" role="group" aria-label="Time range">
			{#each RANGE_OPTIONS as opt (opt.value)}
				<button
					type="button"
					class="range-btn"
					class:is-active={range === opt.value}
					aria-pressed={range === opt.value}
					onclick={() => selectRange(opt.value)}>{opt.label}</button>
			{/each}
		</div>
		<a class="button is-variant-secondary is-icon-left" href={managePath}>
			<i class="fa-solid fa-sliders"></i>
			Manage rules
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
					<span>across {topRules.length} {topRules.length === 1 ? 'rule' : 'rules'}</span>
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
		<h6><strong>Matches over time</strong></h6>
		<div class="legend">
			{#each ['block', 'log', 'allow'] as action (action)}
				<span class="legend-item" data-action={action}>
					<span class="legend-dot"></span>
					{actionLabels[action]}
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
				<i class="fa-solid fa-shield-halved empty-icon"></i>
				<p class="empty-title">No matches in this window</p>
				<p class="empty-sub">Traffic is flowing clean — no rule has fired in the {RANGE_LABEL[range]}.</p>
			</div>
		{:else}
			<WafActivityChart series={chartSeries} from={windowFrom * 1000} to={fetchedAt * 1000} />
		{/if}
	</div>
</div>

{#if !isEmpty}
	<div class="panel is-level-300">
		<div class="panel-head">
			<h6><strong>Top rules</strong></h6>
			<span class="page-sub">by match volume</span>
		</div>
		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Rule</th>
						<th>Action</th>
						<th class="is-align-right">Matches</th>
						<th class="share-col">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each topRules as rule (rule.ruleId)}
						{@const meta = ruleMeta.get(rule.ruleId)}
						{@const action = meta?.action ?? rule.action}
						<tr>
							<td>
								<div class="rule-cell">
									{#if meta?.description}
										<span class="rule-desc">{meta.description}</span>
									{/if}
									<span class="font-mono text-sm text-content/55">{rule.ruleId}</span>
								</div>
							</td>
							<td>
								<span class="act-badge" data-action={action}>{actionLabels[action] ?? action}</span>
							</td>
							<td class="is-align-right font-mono tabular-nums">{rule.total.toLocaleString()}</td>
							<td class="share-col">
								<div class="row-share">
									<span class="share-bar" data-action={action}>
										<span style={`width:${share(rule.total) * 100}%`}></span>
									</span>
									<span class="tabular-nums text-content/60">{pct(rule.total)}</span>
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

{#if hasLimits}
	<div class="panel is-level-300 limit-panel">
		<div class="panel-head">
			<div>
				<h6><strong>Rate limit activity</strong></h6>
				<p class="page-sub">Share of requests over each limit — size shadow limits here before enforcing them.</p>
			</div>
		</div>

		<div class="limit-chart-body">
			{#if limitSpinner}
				<div class="chart-state limit-state text-content/40">
					<i class="fa-solid fa-spinner-third fa-spin text-2xl"></i>
				</div>
			{:else if limitEmpty}
				<div class="chart-state limit-state">
					<i class="fa-solid fa-gauge-high empty-icon"></i>
					<p class="empty-title">No rate limit activity in this range.</p>
					<p class="empty-sub">No request hit a configured limit's bucket in the {RANGE_LABEL[range]}.</p>
				</div>
			{:else}
				<LineChart
					series={limitShareSeries}
					xType="time"
					xDomain={[windowFrom * 1000, fetchedAt * 1000]}
					height={280}
					formatY={(v) => `${format.count(v)}%`}
					formatValue={(v) => sharePct(v)}
					legend />
			{/if}
		</div>

		<div class="table-container limit-table">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Limit</th>
						<th>Mode</th>
						<th class="is-align-right">Allowed</th>
						<th class="is-align-right">Limited</th>
						<th class="is-align-right">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each limitRows as row (row.limit.id)}
						<tr>
							<td>
								<div class="rule-cell">
									<span class="rule-desc">{row.limit.description || row.limit.id}</span>
									<span class="text-sm text-content/55">{describeKey(row.limit.key)} · {row.limit.rate} / {row.limit.window}</span>
								</div>
							</td>
							<td>
								<span class="mode-badge" data-mode={row.limit.mode ?? 'enforce'}>
									{modeLabels[row.limit.mode ?? 'enforce'] ?? row.limit.mode}
								</span>
							</td>
							<td class="is-align-right font-mono tabular-nums">
								{#if row.traffic > 0}
									{row.allowed.toLocaleString()}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td class="is-align-right">
								{#if row.traffic > 0}
									<span class="font-mono tabular-nums">{row.limited.toLocaleString()}</span>
									{#if row.limit.mode === 'shadow'}
										<span class="text-sm text-content/45">would be limited</span>
									{/if}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td class="is-align-right font-mono tabular-nums">
								{#if row.share != null}
									{sharePct(row.share)}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
						</tr>
					{/each}
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
	.range-switch {
		display: inline-flex;
		padding: 0.1875rem;
		gap: 0.125rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.range-btn {
		padding: 0.3125rem 0.6875rem;
		border-radius: 0.4375rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-fastest) ease, background var(--timing-fastest) ease;
	}

	.range-btn:hover {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.range-btn.is-active {
		color: hsl(var(--hsl-primary-content));
		background: hsl(var(--hsl-primary));
	}

	/* KPI tiles — colored by what the firewall decided. */
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

	.stat-tile[data-accent='block'] { --accent: hsl(var(--hsl-negative)); }
	.stat-tile[data-accent='log'] { --accent: hsl(var(--hsl-warning)); }
	.stat-tile[data-accent='allow'] { --accent: hsl(var(--hsl-positive)); }

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

	/* Shared mini bar — fill color follows the row/tile action accent. */
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

	.stat-tile[data-accent='block'] .share-bar > span { background: hsl(var(--hsl-negative)); }
	.stat-tile[data-accent='log'] .share-bar > span { background: hsl(var(--hsl-warning)); }
	.stat-tile[data-accent='allow'] .share-bar > span { background: hsl(var(--hsl-positive)); }

	.share-bar[data-action='block'] > span { background: hsl(var(--hsl-negative)); }
	.share-bar[data-action='log'] > span { background: hsl(var(--hsl-warning)); }
	.share-bar[data-action='allow'] > span { background: hsl(var(--hsl-positive)); }

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

	.legend-item[data-action='block'] .legend-dot { background: hsl(var(--hsl-negative)); }
	.legend-item[data-action='log'] .legend-dot { background: hsl(var(--hsl-warning)); }
	.legend-item[data-action='allow'] .legend-dot { background: hsl(var(--hsl-positive)); }

	/* Top-rules table */
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

	.act-badge[data-action='block'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.act-badge[data-action='log'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.14);
	}

	.act-badge[data-action='allow'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	/* Rate limit activity */
	.limit-panel {
		margin-top: 1rem;
	}

	.limit-chart-body {
		min-height: 280px;
	}

	.limit-state {
		min-height: 280px;
	}

	.limit-table {
		margin-top: 1rem;
	}

	/* Same badge as the manage page's limits table. */
	.mode-badge {
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

	/* Shadow only observes — render it muted so Enforce stands out. */
	.mode-badge[data-mode='shadow'] {
		color: hsl(var(--hsl-content) / 0.5);
		background-color: hsl(var(--hsl-content) / 0.05);
	}
</style>
