<script>
	import LineChart from '$lib/components/LineChart.svelte'
	import { formatBytes, formatNumber } from '$lib/charts/util'

	/**
	 * Metric time-series panel: a titled card wrapping {@link LineChart}. Accepts
	 * the platform's metric shape — a set of named series, each carrying one or
	 * more lines of `[unixSeconds, value]` points — and flattens it for drawing.
	 *
	 * @typedef {Object} Line
	 * @property {string} name
	 * @property {[number, number][]} points   [unixSeconds, value]
	 *
	 * @typedef {Object} Series
	 * @property {string} prefix
	 * @property {Line[]} lines
	 * @property {string} [dashStyle]   any value → rendered dashed (e.g. limits)
	 * @property {string} [color]       'red' maps to the danger token
	 *
	 * @typedef {Object} Props
	 * @property {string} title
	 * @property {string} unit          'bytes' formats Ki/Mi/Gi; else plain number
	 * @property {Series[]} series
	 * @property {'line' | 'spline'} [type]
	 * @property {string} [range]       e.g. '1h', '6hagg' — sizes the time window
	 */

	/** @type {Props} */
	const { title, unit, series, type = 'line', range = '' } = $props()

	/** @param {string} [c] */
	function resolveColor (c) {
		if (!c) return undefined
		if (c === 'red') return 'hsl(var(--hsl-negative))'
		return c
	}

	/** Turn the range token ('6hagg', '1d', …) into a window length in ms. */
	function rangeToMs (/** @type {string} */ r) {
		if (!r) return null
		const base = r.replace('agg', '')
		const num = parseInt(base)
		if (!num) return null
		const u = base.slice(String(num).length)
		const mult = u === 'h' ? 3600_000 : 86_400_000
		return num * mult
	}

	const fmtY = $derived(unit === 'bytes' ? formatBytes : formatNumber)

	// Flatten {prefix, lines[]} into one drawable line each. A single-line series
	// keeps the bare prefix ("Usage"); multi-line series disambiguate with the
	// line's own name ("Usage · web"). The first solid line gets the area fill so
	// the panel reads as one primary trend with reference lines layered over it.
	const flat = $derived.by(() => {
		let areaUsed = false
		/** @type {import('$lib/charts/util').LineSeries[]} */
		const out = []
		for (const s of series ?? []) {
			const lines = s.lines ?? []
			for (const l of lines) {
				const dashed = !!s.dashStyle
				const area = !dashed && !areaUsed
				if (area) areaUsed = true
				out.push({
					name: lines.length > 1 ? `${s.prefix} · ${l.name}` : s.prefix,
					color: resolveColor(s.color),
					dashed,
					area,
					points: (l.points ?? []).map(([ts, v]) => ({ x: ts * 1000, y: +v }))
				})
			}
		}
		return out
	})

	// Anchor the visible window to the newest sample so it tracks live polling.
	const lastTs = $derived.by(() => {
		let m = 0
		for (const s of series ?? []) {
			for (const l of (s.lines ?? [])) {
				for (const p of (l.points ?? [])) m = Math.max(m, p[0] * 1000)
			}
		}
		return m || Date.now()
	})

	const xDomain = $derived.by(() => {
		const ms = rangeToMs(range)
		return ms ? /** @type {[number, number]} */ ([lastTs - ms, lastTs]) : null
	})
</script>

<div class="panel is-level-300 metric-card">
	<h6 class="metric-title"><strong>{title}</strong></h6>
	<LineChart
		series={flat}
		xType="time"
		{xDomain}
		smooth={type === 'spline'}
		formatY={fmtY}
		legend />
</div>

<style>
	.metric-card {
		display: grid;
		gap: 0.5rem;
	}

	.metric-title {
		color: hsl(var(--hsl-content) / 0.85);
	}
</style>
