<script>
	import { onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'
	import { browser } from '$app/environment'

	/** @typedef {Object} Series */
	/** @property {string} prefix */
	/** @property {Array} lines */
	/** @property {string?} dashStyle */
	/** @property {string?} color */

	/**
	 * @typedef {Object} Props
	 * @property {string} title
	 * @property {string} unit
	 * @property {Series[]} series
	 * @property {'line' | 'spline'} [type]
	 * @property {string} [range]
	 */

	/** @type {Props} */
	const {
		title,
		unit,
		series,
		type = 'line',
		range = ''
	} = $props()

	/** @type {HTMLDivElement} */
	let el

	/** @type {import('highcharts').Chart | undefined} */
	let chart = $state.raw(undefined)

	onMount(() => {
		hc.init()

		chart = Highcharts.chart(el, {
			title: {
				text: title
			},
			xAxis: {
				type: 'datetime',
				showEmpty: true
			},
			yAxis: {
				min: 0,
				showEmpty: true,
				labels: {
					formatter () {
						return formatter(this.value)
					}
				}
			},
			series: []
		})

		return () => {
			chart?.destroy()
		}
	})


	function update (name, lines, dashStyle, color) {
		if (!browser || !chart) return
		const c = chart
		if (!lines) lines = []

		lines.forEach((l) => {
			const lineName = name + ' ' + l.name
			const data = l.points.map((pt) => [pt[0] * 1000, +pt[1]])

			const s = c.series?.find((it) => it.name === lineName)
			// already exists, update
			if (s) {
				s.setData(data, false)
				return
			}

			c.addSeries({
				type,
				name: lineName,
				marker: {
					enabled: false
				},
				data,
				dashStyle,
				color
			}, false)
		})
	}

	function clear () {
		[...chart?.series ?? []].forEach((x) => x.remove(false))
	}

	const kib = 1024
	const mib = 1024 * kib
	const gib = 1024 * mib

	function formatter (v) {
		if (unit === 'bytes') {
			if (v > gib) {
				return Highcharts.numberFormat(v / gib, 2) + 'Gi'
			} else if (v > mib) {
				return Highcharts.numberFormat(v / mib, 2) + 'Mi'
			}
			return Highcharts.numberFormat(v / kib, 2) + 'Ki'
		}
		return v
	}

	/** @param {string} r */
	function rangeToMs (r) {
		if (!r) return null
		const base = r.replace('agg', '')
		const num = parseInt(base)
		const unit = base.slice(String(num).length)
		const multiplier = unit === 'h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
		return num * multiplier
	}

	$effect(() => {
		if (!chart) return
		const ms = rangeToMs(range)
		if (ms) {
			const now = Date.now()
			chart.xAxis[0].setExtremes(now - ms, now, false)
		}
		if (series?.length === 0) clear()
		series?.forEach((s) => {
			update(s.prefix, s.lines, s.dashStyle, s.color)
		})
		chart?.redraw()
	})
</script>

<div bind:this={el}></div>
