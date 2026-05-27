<script>
	import dayjs from 'dayjs'
	import { niceScale } from '$lib/charts/util'

	/**
	 * A stacked-column view of WAF matches over time, one stack segment per action
	 * (block / log / allow). Data arrives pre-bucketed onto a shared time grid so
	 * the segments align cleanly. Pure SVG — colors come from the design tokens
	 * via CSS `var()`, so a theme toggle recolors the bars instantly.
	 *
	 * @typedef {Object} ActivitySeries
	 * @property {Api.WafAction} action
	 * @property {string} name
	 * @property {[number, number][]} data   [unixMs, count]
	 *
	 * @typedef {Object} Props
	 * @property {ActivitySeries[]} series   bottom-to-top stacking order
	 * @property {number} from   x-extreme start, unix ms
	 * @property {number} to     x-extreme end, unix ms
	 */

	/** @type {Props} */
	const { series, from, to } = $props()

	/** @type {Record<Api.WafAction, string>} */
	const actionColor = {
		block: 'hsl(var(--hsl-negative))',
		log: 'hsl(var(--hsl-warning))',
		allow: 'hsl(var(--hsl-positive))'
	}

	const PAD = { top: 14, right: 12, bottom: 26, left: 44 }
	const height = 320

	let width = $state(0)
	/** @type {SVGSVGElement | undefined} */
	let svgEl = $state()
	let hover = $state(/** @type {number | null} */ (null))

	/** @param {HTMLElement} node */
	function track (node) {
		const ro = new ResizeObserver((entries) => {
			width = entries[0].contentRect.width
		})
		ro.observe(node)
		return { destroy: () => ro.disconnect() }
	}

	// Shared, sorted bucket x-positions across every action series.
	const xs = $derived.by(() => {
		const set = new Set(series.flatMap((s) => s.data.map((d) => d[0])))
		return [...set].sort((a, b) => a - b)
	})

	// Per-action value lookup keyed by bucket x.
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

	const xScale = $derived((/** @type {number} */ v) =>
		plot.x0 + ((v - from) / (to - from || 1)) * (plot.x1 - plot.x0))

	const yScale = $derived((/** @type {number} */ v) =>
		plot.y1 - ((v - yInfo.min) / (yInfo.max - yInfo.min)) * (plot.y1 - plot.y0))

	const colW = $derived.by(() => {
		const step = xs.length > 1 ? (plot.x1 - plot.x0) / xs.length : (plot.x1 - plot.x0) * 0.4
		return Math.max(2, Math.min(step * 0.72, 44))
	})

	// One stack per bucket: an array of {action, color, name, value, y, h} segments.
	const columns = $derived(xs.map((x, xi) => {
		let cum = 0
		const segs = series.map((s, si) => {
			const v = lookups[si].get(x) ?? 0
			const yTop = yScale(cum + v)
			const yBase = yScale(cum)
			cum += v
			return { action: s.action, color: actionColor[s.action], name: s.name, value: v, y: yTop, h: Math.max(0, yBase - yTop) }
		})
		return { x, xi, cx: xScale(x), total: cum, segs }
	}))

	// y-axis gridlines/labels.
	const timeFmt = $derived.by(() => {
		const span = to - from
		const day = 86400000
		if (span <= 2 * day) return (/** @type {number} */ v) => dayjs(v).format('HH:mm')
		if (span <= 8 * day) return (/** @type {number} */ v) => dayjs(v).format('ddd HH:mm')
		return (/** @type {number} */ v) => dayjs(v).format('MMM D')
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

	/** @param {PointerEvent} e */
	function onMove (e) {
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
			onpointermove={onMove}
			onpointerleave={() => (hover = null)}>
			<!-- gridlines + y labels -->
			{#each yInfo.ticks as t (t)}
				{@const gy = yScale(t)}
				<line class="grid" x1={plot.x0} x2={plot.x1} y1={gy} y2={gy} />
				<text class="axis-label" x={plot.x0 - 8} y={gy} text-anchor="end" dominant-baseline="middle">{t.toLocaleString()}</text>
			{/each}

			<!-- x labels -->
			{#each xTicks as t (t.px)}
				<text class="axis-label" x={t.px} y={height - 8} text-anchor={t.anchor}>{t.label}</text>
			{/each}

			<!-- stacked columns; parent <g> animates once on mount -->
			<g class="cols">
				{#each columns as col (col.x)}
					<g class="col" class:is-dim={hover != null && hover !== col.xi}>
						{#each col.segs as seg (seg.action)}
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
				{#each tip.rows as row (row.action)}
					<div class="tip-row">
						<span class="tip-dot" style:background={row.color}></span>
						<span class="tip-name">{row.name}</span>
						<span class="tip-val">{row.value.toLocaleString()}</span>
					</div>
				{/each}
				<div class="tip-row tip-total">
					<span class="tip-name">Total</span>
					<span class="tip-val">{tip.total.toLocaleString()}</span>
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
		touch-action: none;
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
