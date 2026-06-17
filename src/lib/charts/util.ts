/**
 * Small, dependency-free toolkit shared by the SVG chart components
 * (LineChart, WafActivityChart). Everything here is pure: scale math, value
 * formatting, and SVG path construction. Colors are expressed as CSS custom
 * properties so they resolve per-theme inside the SVG — keep them as `style`
 * values, never as SVG presentation attributes (which don't evaluate var()).
 */

/**
 * A single (x, y) sample. `x` is unix-ms on a time axis, or the category index
 * on a category axis.
 */
export interface ChartPoint {
	x: number
	y: number
}

/**
 * One drawable line for {@link LineChart}.
 */
export interface LineSeries {
	name: string
	points: ChartPoint[]
	color?: string // CSS color; falls back to the shared palette
	dashed?: boolean
	area?: boolean // fill a gradient under the line
}

/**
 * The platform metric-input shape consumed by {@link Chart}: one or more named
 * lines grouped under a label, optionally styled. Distinct from {@link LineSeries},
 * which is the flattened draw model LineChart renders directly.
 */
export interface MetricSeries {
	prefix: string
	lines: Api.UsageMetricsLine[]
	dashStyle?: string // any value → rendered dashed (e.g. limits)
	color?: string // 'red' maps to the danger token
}

/**
 * The default series palette, drawn from the design tokens. Each entry is a CSS
 * color string; setting it via inline `style` (fill/stroke/stop-color) lets the
 * chart recolor instantly when the theme toggles, no re-render needed.
 */
export const palette: string[] = [
	'hsl(var(--hsl-primary))',
	'hsl(var(--hsl-accent))',
	'hsl(var(--hsl-info))',
	'hsl(var(--hsl-positive))',
	'hsl(var(--hsl-warning))',
	'hsl(var(--hsl-negative))'
]

/**
 * Round a span up to a "nice" number (1, 2, 5 × 10ⁿ) — the classic axis-tick
 * rounding so gridlines land on readable values.
 */
function niceNum (range: number, round: boolean): number {
	const exp = Math.floor(Math.log10(range))
	const frac = range / Math.pow(10, exp)
	let nice
	if (round) {
		if (frac < 1.5) nice = 1
		else if (frac < 3) nice = 2
		else if (frac < 7) nice = 5
		else nice = 10
	} else if (frac <= 1) nice = 1
	else if (frac <= 2) nice = 2
	else if (frac <= 5) nice = 5
	else nice = 10
	return nice * Math.pow(10, exp)
}

/**
 * Compute a y-axis scale with round tick values covering [min, max].
 */
export function niceScale (min: number, max: number, targetTicks = 5): { min: number, max: number, ticks: number[] } {
	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		min = 0
		max = 1
	}
	if (min === max) {
		// Flat data — open a small window around the value so it isn't a hairline.
		max = min === 0 ? 1 : min + Math.abs(min) * 0.5
	}
	const step = niceNum((max - min) / Math.max(1, targetTicks - 1), true)
	const niceMin = Math.floor(min / step) * step
	const niceMax = Math.ceil(max / step) * step
	const ticks: number[] = []
	// Guard against float drift adding a phantom final tick.
	for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
		ticks.push(Math.round(v * 1e6) / 1e6)
	}
	return { min: niceMin, max: niceMax, ticks }
}

const KIB = 1024
const MIB = KIB * 1024
const GIB = MIB * 1024
const TIB = GIB * 1024

/** Trim to at most `digits` decimals, dropping trailing zeros. */
function trim (v: number, digits = 2): string {
	return Number(v.toFixed(digits)).toString()
}

/**
 * Binary byte formatting (Ki/Mi/Gi/Ti) for axis labels and tooltips.
 */
export function formatBytes (v: number): string {
	const a = Math.abs(v)
	if (a >= TIB) return trim(v / TIB) + 'Ti'
	if (a >= GIB) return trim(v / GIB) + 'Gi'
	if (a >= MIB) return trim(v / MIB) + 'Mi'
	if (a >= KIB) return trim(v / KIB) + 'Ki'
	return trim(v)
}

/**
 * Compact, locale-aware number for non-byte axes (vCPU-seconds, rps, counts).
 */
export function formatNumber (v: number): string {
	if (!Number.isFinite(v)) return '0'
	const a = Math.abs(v)
	if (a >= 1_000_000) return trim(v / 1_000_000) + 'M'
	if (a >= 10_000) return trim(v / 1000) + 'k'
	return Number(v.toFixed(2)).toLocaleString()
}

interface Pt {
	x: number // pixel x
	y: number // pixel y
}

/**
 * Build an SVG path `d` through the points. With `smooth`, uses a Catmull-Rom
 * spline converted to cubic béziers for organic curves; otherwise straight
 * segments.
 */
export function linePath (pts: Pt[], smooth = false): string {
	if (pts.length === 0) return ''
	if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
	if (!smooth) {
		return 'M' + pts.map((p) => `${p.x},${p.y}`).join('L')
	}
	let d = `M${pts[0].x},${pts[0].y}`
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i]
		const p1 = pts[i]
		const p2 = pts[i + 1]
		const p3 = pts[i + 2] ?? p2
		const c1x = p1.x + (p2.x - p0.x) / 6
		const c1y = p1.y + (p2.y - p0.y) / 6
		const c2x = p2.x - (p3.x - p1.x) / 6
		const c2y = p2.y - (p3.y - p1.y) / 6
		d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
	}
	return d
}

/**
 * Build a closed area path: the line across the top, then down to `baseY` and
 * back. Returns '' for fewer than two points (nothing meaningful to fill).
 */
export function areaPath (pts: Pt[], baseY: number, smooth = false): string {
	if (pts.length < 2) return ''
	const top = linePath(pts, smooth)
	return `${top}L${pts[pts.length - 1].x},${baseY}L${pts[0].x},${baseY}Z`
}
