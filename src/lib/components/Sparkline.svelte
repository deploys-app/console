<script>
	// Tiny inline bar chart for sparse time-series (e.g. WAF matches per minute).
	// Bars are positioned by timestamp across [from, to] so quiet periods read as
	// gaps rather than being collapsed, and heights are normalized to the window's
	// peak. Cheap enough to render one per table row (plain SVG, no chart lib).

	/**
	 * @typedef {Object} Props
	 * @property {[number, number][]} points  // [unixSeconds, value], time-ordered
	 * @property {number} [from]   // x-domain start (unix seconds); defaults to first point
	 * @property {number} [to]     // x-domain end (unix seconds); defaults to last point
	 * @property {number} [width]
	 * @property {number} [height]
	 */

	/** @type {Props} */
	const { points = [], from, to, width = 96, height = 28 } = $props()

	const start = $derived(from ?? points[0]?.[0] ?? 0)
	const end = $derived(to ?? points[points.length - 1]?.[0] ?? 1)
	const span = $derived(Math.max(1, end - start))
	const max = $derived(Math.max(1, ...points.map((p) => p[1])))

	const barW = 2

	const bars = $derived(
		points.map(([ts, v]) => {
			const x = Math.min(width - barW, Math.max(0, ((ts - start) / span) * (width - barW)))
			const h = Math.max(1, (v / max) * (height - 1))
			return { x, y: height - h, h }
		})
	)
</script>

<svg
	class="sparkline"
	viewBox={`0 0 ${width} ${height}`}
	{width}
	{height}
	preserveAspectRatio="none"
	role="img"
	aria-hidden="true"
>
	{#each bars as b, i (i)}
		<rect x={b.x} y={b.y} width={barW} height={b.h} rx="0.75" />
	{/each}
</svg>

<style>
	.sparkline {
		display: block;
	}
	.sparkline rect {
		fill: hsl(var(--hsl-primary));
	}
</style>
