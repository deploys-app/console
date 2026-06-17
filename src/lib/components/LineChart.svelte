<script lang="ts">
	import dayjs from 'dayjs'
	import { palette, niceScale, linePath, areaPath } from '$lib/charts/util'
	import type { LineSeries } from '$lib/charts/util'

	/**
	 * A responsive, theme-reactive SVG line/area chart. Drives both the metric
	 * charts (time x-axis) and the billing report (category x-axis). Colors are
	 * CSS-var strings applied via inline `style`, so a theme toggle recolors the
	 * chart with no re-render and no canvas redraw.
	 */

	interface Props {
		series: LineSeries[]
		xType?: 'time' | 'category'
		categories?: string[] // labels when xType is 'category'
		xDomain?: [number, number] | null // explicit [min,max] for time
		smooth?: boolean // spline vs. straight segments
		height?: number
		formatY?: (v: number) => string
		formatValue?: (v: number) => string // tooltip value (defaults to formatY)
		valueSuffix?: string // appended in the tooltip
		legend?: boolean
	}

	const {
		series,
		xType = 'time',
		categories = [],
		xDomain = null,
		smooth = false,
		height = 260,
		formatY = (v) => String(v),
		formatValue,
		valueSuffix = '',
		legend = false
	}: Props = $props()

	const PAD = { top: 14, right: 16, bottom: 26, left: 52 }

	let width = $state(0)
	let svgEl = $state<SVGSVGElement | undefined>()
	// index into `frame`, or null when not hovering
	let hover = $state<number | null>(null)

	function track (node: HTMLElement) {
		const ro = new ResizeObserver((entries) => {
			width = entries[0].contentRect.width
		})
		ro.observe(node)
		return { destroy: () => ro.disconnect() }
	}

	const colorOf = (s: LineSeries, i: number): string =>
		s.color ?? palette[i % palette.length]

	// ── Domains ────────────────────────────────────────────────────────────
	const allY = $derived(series.flatMap((s) => s.points.map((p) => p.y)))
	const yScaleInfo = $derived(niceScale(0, allY.length ? Math.max(...allY) : 0, 5))

	const xExtent = $derived.by((): [number, number] => {
		if (xType === 'category') return [0, Math.max(0, categories.length - 1)]
		if (xDomain) return xDomain
		const xs = series.flatMap((s) => s.points.map((p) => p.x))
		if (!xs.length) return [0, 1]
		const lo = Math.min(...xs)
		const hi = Math.max(...xs)
		return lo === hi ? [lo - 1, hi + 1] : [lo, hi]
	})

	// ── Pixel geometry ─────────────────────────────────────────────────────
	const plot = $derived({
		x0: PAD.left,
		x1: Math.max(PAD.left + 1, width - PAD.right),
		y0: PAD.top,
		y1: height - PAD.bottom
	})

	const xScale = $derived((v: number) => {
		const [lo, hi] = xExtent
		if (xType === 'category' && hi === lo) return (plot.x0 + plot.x1) / 2
		return plot.x0 + ((v - lo) / (hi - lo)) * (plot.x1 - plot.x0)
	})

	const yScale = $derived((v: number) => {
		const { min, max } = yScaleInfo
		return plot.y1 - ((v - min) / (max - min)) * (plot.y1 - plot.y0)
	})

	const baseY = $derived(yScale(yScaleInfo.min))

	// Per-series pixel paths and value lookups.
	const drawn = $derived(series.map((s, i) => {
		const pts = s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) }))
		return {
			name: s.name,
			color: colorOf(s, i),
			dashed: !!s.dashed,
			area: !!s.area,
			line: linePath(pts, smooth),
			fill: s.area ? areaPath(pts, baseY, smooth) : '',
			byX: new Map(s.points.map((p) => [p.x, p.y]))
		}
	}))

	// Shared x-positions for the crosshair, from the union of all series.
	const frame = $derived.by(() => {
		const xs = new Set(series.flatMap((s) => s.points.map((p) => p.x)))
		return [...xs].sort((a, b) => a - b).map((x) => ({ x, px: xScale(x) }))
	})

	// ── Axis ticks ───────────────────────────────────────────────────────────
	const timeFmt = $derived.by(() => {
		const [lo, hi] = xExtent
		const span = hi - lo
		const day = 86400000
		if (span <= 2 * day) return (v: number) => dayjs(v).format('HH:mm')
		if (span <= 8 * day) return (v: number) => dayjs(v).format('ddd HH:mm')
		return (v: number) => dayjs(v).format('MMM D')
	})

	const xTicks = $derived.by(() => {
		if (xType === 'category') {
			const n = categories.length
			if (n === 0) return []
			const stride = n <= 8 ? 1 : Math.ceil(n / 6)
			const out: { px: number, label: string, anchor: string }[] = []
			for (let i = 0; i < n; i += stride) {
				out.push({ px: xScale(i), label: categories[i], anchor: i === 0 ? 'start' : i >= n - 1 ? 'end' : 'middle' })
			}
			return out
		}
		const [lo, hi] = xExtent
		const count = 5
		return Array.from({ length: count }, (_, i) => {
			const v = lo + ((hi - lo) * i) / (count - 1)
			return { px: xScale(v), label: timeFmt(v), anchor: i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle' }
		})
	})

	// ── Tooltip ──────────────────────────────────────────────────────────────
	const fmtVal = $derived(formatValue ?? formatY)

	const tip = $derived.by(() => {
		if (hover == null || !frame[hover]) return null
		const f = frame[hover]
		const rows = drawn
			.map((d) => ({ name: d.name, color: d.color, y: d.byX.get(f.x) }))
			.filter((r) => r.y != null)
		if (!rows.length) return null
		const header = xType === 'category'
			? (categories[f.x] ?? '')
			: dayjs(f.x).format('MMM D, HH:mm')
		return { px: f.px, header, rows }
	})

	function onMove (e: PointerEvent) {
		if (!frame.length || !svgEl) return
		const rect = svgEl.getBoundingClientRect()
		const px = e.clientX - rect.left
		let best = 0
		let bestD = Infinity
		for (let i = 0; i < frame.length; i++) {
			const d = Math.abs(frame[i].px - px)
			if (d < bestD) { bestD = d; best = i }
		}
		hover = best
	}

	// Touch: capture the pointer on press so a horizontal drag keeps reading
	// points even when the finger strays outside the SVG, and reveal the nearest
	// point on a plain tap. `touch-action: pan-y` leaves vertical page scroll to
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
			<defs>
				{#each drawn as d, i (d.name)}
					{#if d.area}
						<linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" style:stop-color={d.color} stop-opacity="0.28" />
							<stop offset="100%" style:stop-color={d.color} stop-opacity="0" />
						</linearGradient>
					{/if}
				{/each}
			</defs>

			<!-- horizontal gridlines + y labels -->
			{#each yScaleInfo.ticks as t (t)}
				{@const gy = yScale(t)}
				<line class="grid" x1={plot.x0} x2={plot.x1} y1={gy} y2={gy} />
				<text class="axis-label" x={plot.x0 - 8} y={gy} text-anchor="end" dominant-baseline="middle">{formatY(t)}</text>
			{/each}

			<!-- x labels -->
			{#each xTicks as t (t.px)}
				<text class="axis-label" x={t.px} y={height - 8} text-anchor={t.anchor}>{t.label}</text>
			{/each}

			<!-- areas, then lines on top -->
			{#each drawn as d, i (d.name)}
				{#if d.fill}
					<path class="area" d={d.fill} fill={`url(#grad-${i})`} />
				{/if}
			{/each}
			{#each drawn as d (d.name)}
				<path
					class="line"
					class:is-dashed={d.dashed}
					class:is-solid={!d.dashed}
					d={d.line}
					style:stroke={d.color}
					pathLength={d.dashed ? undefined : 1} />
			{/each}

			<!-- crosshair + markers -->
			{#if tip}
				<line class="crosshair" x1={tip.px} x2={tip.px} y1={plot.y0} y2={plot.y1} />
				{#each drawn as d (d.name)}
					{@const yv = d.byX.get(frame[hover as number].x)}
					{#if yv != null}
						<circle class="marker" cx={tip.px} cy={yScale(yv)} r="3.5" style:fill={d.color} />
					{/if}
				{/each}
			{/if}
		</svg>

		{#if tip}
			<div
				class="tooltip"
				style:left={`${tip.px}px`}
				style:top={`${PAD.top}px`}
				style:transform={tip.px > width / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)'}>
				<div class="tip-head">{tip.header}</div>
				{#each tip.rows as row (row.name)}
					<div class="tip-row">
						<span class="tip-dot" style:background={row.color}></span>
						<span class="tip-name">{row.name}</span>
						<span class="tip-val">{fmtVal(row.y as number)}{valueSuffix}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

{#if legend}
	<div class="legend">
		{#each series as s, i (s.name)}
			<span class="legend-item">
				<span class="legend-dot" class:is-dashed={s.dashed} style:background={colorOf(s, i)}></span>
				{s.name}
			</span>
		{/each}
	</div>
{/if}

<style>
	.chart {
		position: relative;
		width: 100%;
		/* The SVG inside is sized via JS (`width={width}` attribute), which gives
		   it an intrinsic min-content size equal to its current pixel width. Without
		   `min-width: 0` the chart container is held open against its parent at
		   that intrinsic size — the grid cell shrinks underneath but `.chart` does
		   not, ResizeObserver never sees a smaller contentRect, and the SVG never
		   re-renders. `overflow: hidden` clips the brief transient where the SVG
		   still has its previous (larger) width between resize and re-render. */
		min-width: 0;
		overflow: hidden;
	}

	.surface {
		display: block;
		overflow: visible;
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

	.area {
		stroke: none;
		pointer-events: none;
	}

	.line {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
		pointer-events: none;
	}

	.line.is-dashed {
		stroke-width: 1.75;
		stroke-dasharray: 6 5;
		opacity: 0.9;
	}

	.crosshair {
		stroke: hsl(var(--hsl-content) / 0.35);
		stroke-width: 1;
		stroke-dasharray: 3 3;
		pointer-events: none;
	}

	.marker {
		stroke: hsl(var(--hsl-base-300));
		stroke-width: 2;
		pointer-events: none;
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

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 1rem;
		margin-top: 0.75rem;
		padding-left: 0.5rem;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.legend-dot {
		width: 0.75rem;
		height: 0.2rem;
		border-radius: 9999px;
	}

	.legend-dot.is-dashed {
		background-image: repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px);
	}

	@media (prefers-reduced-motion: no-preference) {
		.line.is-solid {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
			animation: draw 0.9s ease forwards;
		}

		.line.is-dashed {
			animation: fade 0.6s ease 0.2s forwards;
			opacity: 0;
		}

		.area {
			transform-origin: bottom;
			animation: rise 0.7s ease forwards;
			opacity: 0;
		}

		@keyframes draw {
			to { stroke-dashoffset: 0; }
		}

		@keyframes fade {
			to { opacity: 0.9; }
		}

		@keyframes rise {
			from { opacity: 0; transform: scaleY(0.85); }
			to { opacity: 1; transform: scaleY(1); }
		}
	}
</style>
