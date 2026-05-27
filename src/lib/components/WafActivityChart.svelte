<script>
	import { onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'
	import { browser } from '$app/environment'

	/**
	 * A stacked-column view of WAF matches over time, one stack segment per
	 * action (block / log / allow). Data arrives pre-bucketed onto a shared time
	 * grid so the segments align cleanly.
	 *
	 * @typedef {Object} ActivitySeries
	 * @property {Api.WafAction} action
	 * @property {string} name
	 * @property {[number, number][]} data  // [unixMs, count]
	 */

	/**
	 * @typedef {Object} Props
	 * @property {ActivitySeries[]} series
	 * @property {number} from  // x-extreme start, unix ms
	 * @property {number} to    // x-extreme end, unix ms
	 */

	/** @type {Props} */
	const { series, from, to } = $props()

	/** @type {HTMLDivElement} */
	let el

	/** @type {import('highcharts').Chart | undefined} */
	let chart = $state.raw(undefined)

	// Highcharts paints series colors onto SVG `fill` attributes, where CSS
	// `var()` does NOT resolve — so read the theme's HSL triplet off the document
	// and hand Highcharts a concrete color. Re-read on every sync so a theme
	// toggle (followed by the next refresh) recolors correctly.
	/** @type {Record<Api.WafAction, string>} */
	const tokenByAction = {
		block: '--hsl-negative',
		log: '--hsl-warning',
		allow: '--hsl-positive'
	}

	/** @param {Api.WafAction} action */
	function actionColor (action) {
		if (!browser) return undefined
		const triplet = getComputedStyle(document.documentElement)
			.getPropertyValue(tokenByAction[action]).trim()
		return triplet ? `hsl(${triplet})` : undefined
	}

	onMount(() => {
		hc.init()

		chart = Highcharts.chart(el, {
			chart: {
				type: 'column',
				height: 320,
				spacingTop: 16,
				spacingBottom: 8
			},
			title: { text: undefined },
			legend: { enabled: false },
			xAxis: {
				type: 'datetime',
				showEmpty: true,
				gridLineWidth: 0
			},
			yAxis: {
				min: 0,
				title: { text: null },
				allowDecimals: false,
				showEmpty: true
			},
			plotOptions: {
				column: {
					stacking: 'normal',
					borderWidth: 0,
					pointPadding: 0.02,
					groupPadding: 0.05,
					crisp: false
				}
			},
			tooltip: {
				shared: true,
				useHTML: true,
				headerFormat: '<span style="font-size:0.75rem;opacity:0.7">{point.key}</span><br>',
				pointFormat: '<span style="color:{series.color}">●</span> {series.name}: <b>{point.y}</b><br>'
			},
			series: []
		})

		return () => {
			chart?.destroy()
		}
	})

	// Sync incoming series into the chart: update existing stacks in place,
	// add new ones, drop ones that no longer have data.
	$effect(() => {
		if (!browser || !chart) return
		const c = chart
		const names = new Set(series.map((s) => s.name))

		;[...c.series].forEach((s) => {
			if (!names.has(s.name)) s.remove(false)
		})

		series.forEach((s) => {
			const color = actionColor(s.action)
			const existing = c.series.find((it) => it.name === s.name)
			if (existing) {
				existing.update({ type: 'column', color }, false)
				existing.setData(s.data, false)
				return
			}
			c.addSeries({
				type: 'column',
				name: s.name,
				data: s.data,
				color
			}, false)
		})

		c.xAxis[0].setExtremes(from, to, false)
		c.redraw()
	})
</script>

<div bind:this={el}></div>
