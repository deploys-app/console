<script lang="ts">
	import dayjs from 'dayjs'
	import { niceScale } from '$lib/charts/util'

	/**
	 * A stacked-column view of edge response-cache outcomes over time, one stack
	 * segment per result (HIT / STALE / MISS / BYPASS). Data arrives pre-bucketed
	 * onto a shared time grid so the segments align. `formatY` formats the y-axis
	 * and tooltip values, so the same chart renders request counts or byte volume
	 * depending on the caller's view toggle. Pure SVG — colors come from design
	 * tokens via CSS `var()`, so a theme toggle recolors the bars instantly.
	 * (Mirrors WafActivityChart, generalized off the WAF-action coupling.)
	 */

	interface ResultSeries {
		result: string
		name: string
		color: string
		data: [number, number][] // [unixMs, value]
	}

	interface Props {
		series: ResultSeries[] // bottom-to-top stacking order
		from: number // x-extreme start, unix ms
		to: number // x-extreme end, unix ms
		formatY?: (v: number) => string
	}

	const { series, from, to, formatY = (v: number) => v.toLocaleString() }: Props = $props()

	const PAD = { top: 14, right: 12, bottom: 26, left: 56 }
	const height = 320

	let width = $state(0)
	let svgEl = $state<SVGSVGElement | undefined>()
	let hover = $state<number | null>(null)

	function track (node: HTMLElement) {
		const ro = new ResizeObserver((entries) => {
			width = entries[0].contentRect.width
		})
		ro.observe(node)
		return { destroy: () => ro.disconnect() }
	}

	// Shared, sorted bucket x-positions across every result series.
	const xs = $derived.by(() => {
		const set = new Set(series.flatMap((s) => s.data.map((d) => d[0])))
		return [...set].sort((a, b) => a - b)
	})

	// Per-result value lookup keyed by bucket x.
	const lookups = $derived(series.map((s) => new Map(s.data.map((d) => d))))

	const maxStack = $derived.by(() => {
		let m = 0
		for (const x of xs) {
			let sum = 0
			for (const map of lookups) sum += map.get(x) ?? 0
			if (sum > m) m = sum
		}
		return m
	})

	const yInfo = $derived(niceScale(0, maxStack, 5))

	const plot = $derived({
		x0: PAD.left,
		x1: Math.max(PAD.left + 1, width - PAD.right),
		y0: PAD.top,
		y1: height - PAD.bottom
	})

	const xScale = $derived((v: number) =>
		plot.x0 + ((v - from) / (to - from || 1)) * (plot.x1 - plot.x0))

	const yScale = $derived((v: number) =>
		plot.y1 - ((v - yInfo.min) / (yInfo.max - yInfo.min)) * (plot.y1 - plot.y0))

	// Size columns to the data's real cadence — the smallest pixel gap between
	// adjacent bucket centers — NOT plot-width / bucket-count. Buckets are placed
	// by timestamp (xScale), so a count-based width balloons when the data is
	// sparse: a few buckets clustered near "now" (a freshly-deployed or low-traffic
	// project) each become ~plot-width/N wide, so they overlap and clip at the
	// edge. Gap-based width keeps them tight to their timestamps in every case;
	// for a dense even grid min-gap ≈ plot-width/N, so this is unchanged there.
	const colW = $derived.by(() => {
		if (xs.length < 2) return 24
		let minGap = Infinity
		for (let i = 1; i < xs.length; i++) {
			const g = xScale(xs[i]) - xScale(xs[i - 1])
			if (g > 0 && g < minGap) minGap = g
		}
		if (!Number.isFinite(minGap)) return 24
		return Math.max(2, Math.min(minGap * 0.72, 44))
	})

	// One stack per bucket: an array of {result, color, name, value, y, h} segments.
	const columns = $derived(xs.map((x, xi) => {
		let cum = 0
		const segs = series.map((s, si) => {
			const v = lookups[si].get(x) ?? 0
			const yTop = yScale(cum + v)
			const yBase = yScale(cum)
			cum += v
			return { result: s.result, color: s.color, name: s.name, value: v, y: yTop, h: Math.max(0, yBase - yTop) }
		})
		return { x, xi, cx: xScale(x), total: cum, segs }
	}))

	const timeFmt = $derived.by(() => {
		const span = to - from
		const day = 86400000
		if (span <= 2 * day) return (v: number) => dayjs(v).format('HH:mm')
		if (span <= 8 * day) return (v: number) => dayjs(v).format('ddd HH:mm')
		return (v: number) => dayjs(v).format('MMM D')
	})

	const xTicks = $derived.by(() => {
		const count = 5
		return Array.from({ length: count }, (_, i) => {
			const v = from + ((to - from) * i) / (count - 1)
			return { px: xScale(v), label: timeFmt(v), anchor: i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle' }
		})
	})

	const tip = $derived.by(() => {
		if (hover == null || !columns[hover]) return null
		const col = columns[hover]
		const rows = col.segs.filter((s) => s.value > 0)
		if (!rows.length) return null
		return { px: col.cx, header: dayjs(col.x).format('MMM D, HH:mm'), total: col.total, rows }
	})

	function onMove (e: PointerEvent) {
		if (!columns.length || !svgEl) return
		const rect = svgEl.getBoundingClientRect()
		const px = e.clientX - rect.left
		let best = 0
		let bestD = Infinity
		for (let i = 0; i < columns.length; i++) {
			const d = Math.abs(columns[i].cx - px)
			if (d < bestD) { bestD = d; best = i }
		}
		hover = best
	}

	// Touch: capture the pointer on press so a horizontal drag keeps reading
	// columns even when the finger strays outside the SVG, and reveal the nearest
	// column on a plain tap. `touch-action: pan-y` leaves vertical page scroll to
	// the browser, which fires pointercancel and clears the readout on a scroll.
	function onDown (e: PointerEvent) {
		if (e.pointerType !== 'mouse') svgEl?.setPointerCapture?.(e.pointerId)
		onMove(e)
	}

	function onUp (e: PointerEvent) {
		if (e.pointerType !== 'mouse') hover = null
	}
</script>

<div class="chart" style:height={`${height}px`} use:track>
	{#if width > 0}
		<svg
			bind:this={svgEl}
			class="surface"
			{width}
			{height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			onpointerdown={onDown}
			onpointermove={onMove}
			onpointerup={onUp}
			onpointercancel={() => (hover = null)}
			onpointerleave={() => (hover = null)}>
			<!-- gridlines + y labels -->
			{#each yInfo.ticks as t (t)}
				{@const gy = yScale(t)}
				<line class="grid" x1={plot.x0} x2={plot.x1} y1={gy} y2={gy} />
				<text class="axis-label" x={plot.x0 - 8} y={gy} text-anchor="end" dominant-baseline="middle">{formatY(t)}</text>
			{/each}

			<!-- x labels -->
			{#each xTicks as t (t.px)}
				<text class="axis-label" x={t.px} y={height - 8} text-anchor={t.anchor}>{t.label}</text>
			{/each}

			<!-- stacked columns; parent <g> animates once on mount -->
			<g class="cols">
				{#each columns as col (col.x)}
					<g class="col" class:is-dim={hover != null && hover !== col.xi}>
						{#each col.segs as seg (seg.result)}
							{#if seg.h > 0}
								<rect x={col.cx - colW / 2} y={seg.y} width={colW} height={seg.h} rx="1" style:fill={seg.color} />
							{/if}
						{/each}
					</g>
				{/each}
			</g>
		</svg>

		{#if tip}
			<div
				class="tooltip"
				style:left={`${tip.px}px`}
				style:top={`${PAD.top}px`}
				style:transform={tip.px > width / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'}>
				<div class="tip-head">{tip.header}</div>
				{#each tip.rows as row (row.result)}
					<div class="tip-row">
						<span class="tip-dot" style:background={row.color}></span>
						<span class="tip-name">{row.name}</span>
						<span class="tip-val">{formatY(row.value)}</span>
					</div>
				{/each}
				<div class="tip-row tip-total">
					<span class="tip-name">Total</span>
					<span class="tip-val">{formatY(tip.total)}</span>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
	}

	.surface {
		display: block;
		/* let the page scroll vertically; horizontal drags read the chart */
		touch-action: pan-y;
	}

	.grid {
		stroke: hsl(var(--hsl-line) / 0.55);
		stroke-width: 1;
		shape-rendering: crispEdges;
	}

	.axis-label {
		fill: hsl(var(--hsl-content) / 0.5);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.col {
		transition: opacity 0.12s ease;
	}

	.col.is-dim {
		opacity: 0.4;
	}

	.tooltip {
		position: absolute;
		z-index: 5;
		min-width: 9rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		background: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		box-shadow: 0 4px 12px hsl(220 20% 10% / 0.12), 0 12px 28px hsl(220 20% 10% / 0.16);
		pointer-events: none;
		font-size: 0.75rem;
	}

	.tip-head {
		margin-bottom: 0.375rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
		font-variant-numeric: tabular-nums;
	}

	.tip-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		line-height: 1.6;
	}

	.tip-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.tip-name {
		color: hsl(var(--hsl-content) / 0.8);
		margin-right: auto;
	}

	.tip-val {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		padding-left: 0.75rem;
	}

	.tip-total {
		margin-top: 0.25rem;
		padding-top: 0.25rem;
		border-top: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.tip-total .tip-name {
		color: hsl(var(--hsl-content) / 0.6);
		font-weight: 600;
	}

	@media (prefers-reduced-motion: no-preference) {
		.cols {
			transform-box: fill-box;
			transform-origin: center bottom;
			animation: grow 0.6s cubic-bezier(0.22, 1, 0.36, 1);
		}

		@keyframes grow {
			from { opacity: 0; transform: scaleY(0.6); }
			to { opacity: 1; transform: scaleY(1); }
		}
	}
</style>
