<script lang="ts">
	import LineChart from '$lib/components/LineChart.svelte'
	import { formatBytes, formatNumber } from '$lib/charts/util'
	import type { LineSeries, MetricSeries } from '$lib/charts/util'

	/**
	 * Metric time-series panel: a titled card wrapping {@link LineChart}. Accepts
	 * the platform's metric shape — a set of named series, each carrying one or
	 * more lines of `[unixSeconds, value]` points — and flattens it for drawing.
	 */

	interface Props {
		title: string
		unit: string // 'bytes' formats Ki/Mi/Gi; else plain number
		series: MetricSeries[]
		type?: 'line' | 'spline'
		range?: string // e.g. '1h', '6hagg' — sizes the time window
	}

	const { title, unit, series, type = 'line', range = '' }: Props = $props()

	function resolveColor (c?: string): string | undefined {
		if (!c) return undefined
		if (c === 'red') return 'hsl(var(--hsl-negative))'
		return c
	}

	/** Turn the range token ('6hagg', '1d', …) into a window length in ms. */
	function rangeToMs (r: string): number | null {
		if (!r) return null
		const base = r.replace('agg', '')
		const num = parseInt(base)
		if (!num) return null
		const u = base.slice(String(num).length)
		const mult = u === 'h' ? 3600_000 : 86_400_000
		return num * mult
	}

	const fmtY = $derived(unit === 'bytes' ? formatBytes : formatNumber)

	// Every pod of one deployment shares a long, identical name prefix — the k8s
	// resource name and project id (`web-123-…`, or `0d456-123-…` for id-named
	// deployments). That prefix is the same on every line, so in the legend it's
	// pure noise that pushes the part that actually differs (the pod hash) off
	// the edge. Strip the longest prefix common to all lines, trimmed back to a
	// '-' boundary so whole name segments are removed (never a hash mid-token).
	// This also hides the otherwise-opaque `0d<id>` resource name.
	const podPrefixLen = $derived.by(() => {
		const names: string[] = []
		for (const s of series ?? []) {
			for (const l of (s.lines ?? [])) names.push(l.name ?? '')
		}
		if (names.length < 2) return 0
		let p = names[0]
		for (let i = 1; i < names.length && p; i++) {
			const n = names[i]
			let j = 0
			while (j < p.length && j < n.length && p[j] === n[j]) j++
			p = p.slice(0, j)
		}
		const cut = p.lastIndexOf('-')
		return cut >= 0 ? cut + 1 : 0
	})

	function podLabel (name: string): string {
		return name.slice(podPrefixLen) || name
	}

	// Flatten {prefix, lines[]} into one drawable line each. A single-line series
	// keeps the bare prefix ("Usage"); multi-line series disambiguate with the
	// pod's distinguishing suffix ("Usage · x2k9p"). The first solid line gets the
	// area fill so the panel reads as one primary trend with reference lines
	// layered over it.
	const flat = $derived.by(() => {
		let areaUsed = false
		const out: LineSeries[] = []
		for (const s of series ?? []) {
			const lines = s.lines ?? []
			for (const l of lines) {
				const dashed = !!s.dashStyle
				const area = !dashed && !areaUsed
				if (area) areaUsed = true
				out.push({
					name: lines.length > 1 ? `${s.prefix} · ${podLabel(l.name)}` : s.prefix,
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
		return ms ? ([lastTs - ms, lastTs] as [number, number]) : null
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
