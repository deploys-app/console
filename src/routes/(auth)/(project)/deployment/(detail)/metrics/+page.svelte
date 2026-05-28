<script>
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
	import api from '$lib/api'
	import { onMount, tick } from 'svelte'
	import Chart from '$lib/components/Chart.svelte'

	const { data } = $props()

	// Two-row pill bar: top row is the rolling-window options, bottom row is
	// the aggregate (longer) windows. Aggregate options are tagged so we can
	// style them distinctly.
	const RANGES = [
		{ value: '1h', label: '1h', group: 'live' },
		{ value: '6h', label: '6h', group: 'live' },
		{ value: '12h', label: '12h', group: 'live' },
		{ value: '1d', label: '1d', group: 'live' },
		{ value: '1hagg', label: '1h', group: 'agg' },
		{ value: '6hagg', label: '6h', group: 'agg' },
		{ value: '12hagg', label: '12h', group: 'agg' },
		{ value: '1dagg', label: '1d', group: 'agg' },
		{ value: '2dagg', label: '2d', group: 'agg' },
		{ value: '7dagg', label: '7d', group: 'agg' },
		{ value: '30dagg', label: '30d', group: 'agg' }
	]

	const deployment = $derived(data.deployment)

	const RELOAD_INTERVAL_MS = 60_000

	const validRanges = new Set(RANGES.map((o) => o.value))
	const initialRange = $page.url.searchParams.get('range')

	const filter = $state({
		range: initialRange && validRanges.has(initialRange) ? initialRange : '1hagg'
	})

	let cpu = $state([])
	let memory = $state([])
	let request = $state([])
	let egress = $state([])

	let reloadTimeout
	let lastFetchAt = $state(0)
	let now = $state(Date.now())
	let fetching = $state(false)

	async function fetchMetrics (clearFirst = false) {
		reloadTimeout && clearTimeout(reloadTimeout)
		reloadTimeout = null
		fetching = true

		try {
			const resp = await api.invoke('deployment.metrics', {
				project: deployment.project,
				location: deployment.location,
				name: deployment.name,
				timeRange: filter.range
			}, fetch)
			if (!resp.ok) return

			if (clearFirst) {
				cpu = []
				memory = []
				request = []
				egress = []
				await tick()
			}

			cpu = [
				{ prefix: 'Usage', lines: resp.result.cpuUsage ?? [] },
				{ prefix: 'Limit', lines: resp.result.cpuLimit ?? [], dashStyle: 'LongDash', color: 'red' }
			]
			memory = [
				{ prefix: 'Usage', lines: resp.result.memoryUsage ?? [] },
				{ prefix: 'Allocated', lines: resp.result.memory ?? [] },
				{ prefix: 'Limit', lines: resp.result.memoryLimit ?? [], dashStyle: 'LongDash', color: 'red' }
			]
			if (deployment.type === 'WebService') {
				request = [{ prefix: 'Requests', lines: resp.result.requests ?? [] }]
			}
			egress = [{ prefix: 'Egress', lines: resp.result.egress ?? [] }]
			lastFetchAt = Date.now()
		} finally {
			fetching = false
			reloadTimeout && clearTimeout(reloadTimeout)
			reloadTimeout = setTimeout(fetchMetrics, RELOAD_INTERVAL_MS)
		}
	}

	/** @param {string} value */
	function setRange (value) {
		if (value === filter.range) return
		filter.range = value
		const u = new URL($page.url)
		u.searchParams.set('range', value)
		replaceState(u, {})
		fetchMetrics(true)
	}

	onMount(() => {
		fetchMetrics()
		const ticker = setInterval(() => { now = Date.now() }, 1000)
		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
			clearInterval(ticker)
		}
	})

	/** @param {number} t */
	function relTime (t) {
		if (!t) return '—'
		const diff = Math.max(0, now - t)
		if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
		return `${Math.floor(diff / 3_600_000)}h ago`
	}
</script>

<style>
	.metric-rail {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1rem;
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 10px;
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-primary);
		font-feature-settings: 'tnum' 1;
		flex-wrap: wrap;
	}

	.metric-rail__brand {
		margin: 0;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		font-size: 0.9rem;
	}

	.metric-rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid hsl(var(--hsl-content) / 0.08);
	}

	.stat {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.8125rem;
	}

	.stat__value {
		color: hsl(var(--hsl-content));
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.stat__unit { color: hsl(var(--hsl-content) / 0.5); }

	.stat-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: hsl(var(--hsl-positive));
		animation: live-pulse 1.8s ease-out infinite;
	}

	.stat-dot[data-state='fetching'] {
		background: hsl(var(--hsl-primary));
		animation: dim-blink 0.8s ease-in-out infinite;
	}

	@keyframes live-pulse {
		0%, 100% { box-shadow: 0 0 0 0 hsl(var(--hsl-positive) / 0.55); }
		60%      { box-shadow: 0 0 0 6px hsl(var(--hsl-positive) / 0); }
	}
	@keyframes dim-blink {
		0%, 100% { opacity: 0.5; }
		50%      { opacity: 1; }
	}

	.metric-rail__ranges {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.range-group {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		/* Let the pills inside wrap when the group itself can't fit on one
		   line — the agg row has 7 options + a label, which is too wide for
		   iPhone-class viewports. */
		flex-wrap: wrap;
	}

	.range-group__label {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.5);
		font-weight: 500;
		margin-right: 0.25rem;
	}

	.range-pill {
		display: inline-flex;
		align-items: center;
		padding: 0 0.6rem;
		height: 1.6rem;
		min-width: 1.8rem;
		justify-content: center;
		background: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.1);
		border-radius: 6px;
		color: hsl(var(--hsl-content) / 0.75);
		font-family: var(--ffml-primary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.range-pill:hover {
		background: hsl(var(--hsl-content) / 0.05);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.15);
	}

	.range-pill[data-active='true'] {
		background: hsl(var(--hsl-primary) / 0.1);
		color: hsl(var(--hsl-primary));
		border-color: hsl(var(--hsl-primary) / 0.45);
	}

	.range-pill[data-group='agg']::before {
		content: 'Σ';
		font-size: 0.625rem;
		margin-right: 0.3rem;
		color: currentColor;
		opacity: 0.6;
	}

	.metric-grid {
		display: grid;
		/* `minmax(0, 1fr)` rather than `1fr` so each cell can shrink below the
		   chart's intrinsic min-content width — without this the SVG holds the
		   column open and the grid overflows horizontally as the window narrows. */
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	@media (min-width: 1024px) {
		.metric-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
</style>

<header class="metric-rail">
	<h6 class="metric-rail__brand">Metrics</h6>

	<div class="metric-rail__stats">
		<span class="stat" title={fetching ? 'fetching…' : 'auto-refresh active'}>
			<span class="stat-dot" data-state={fetching ? 'fetching' : 'live'}></span>
			<span class="stat__value">Auto</span>
			<span class="stat__unit">· every {RELOAD_INTERVAL_MS / 1000}s</span>
		</span>
		<span class="stat">
			<span class="stat__unit">last sync</span>
			<span class="stat__value">{relTime(lastFetchAt)}</span>
		</span>
	</div>

	<div class="metric-rail__ranges" role="group" aria-label="time range">
		<span class="range-group">
			<span class="range-group__label">Live</span>
			{#each RANGES.filter((r) => r.group === 'live') as r (r.value)}
				<button type="button" class="range-pill"
					data-active={filter.range === r.value}
					data-group="live"
					onclick={() => setRange(r.value)}>
					{r.label}
				</button>
			{/each}
		</span>
		<span class="range-group">
			<span class="range-group__label">Agg</span>
			{#each RANGES.filter((r) => r.group === 'agg') as r (r.value)}
				<button type="button" class="range-pill"
					data-active={filter.range === r.value}
					data-group="agg"
					onclick={() => setRange(r.value)}>
					{r.label}
				</button>
			{/each}
		</span>
	</div>
</header>

<div class="metric-grid">
	<Chart title="vCPU (second)" unit="seconds" series={cpu} range={filter.range} />
	<Chart title="Memory (bytes)" unit="bytes" series={memory} range={filter.range} />
	{#if deployment.type === 'WebService'}
		<Chart title="Request (rps)" unit="rps" series={request} range={filter.range} />
	{/if}
	<Chart title="Egress (bytes)" unit="bytes" series={egress} range={filter.range} />
</div>
