<script lang="ts">
	import { untrack } from 'svelte'
	import { browser } from '$app/environment'
	import api from '$lib/api'
	import Chart from '$lib/components/Chart.svelte'
	import RangeSwitch from '$lib/components/RangeSwitch.svelte'
	import OptionSelect from '$lib/components/OptionSelect.svelte'
	import { RANGE_SECONDS } from '$lib/metrics'
	import { TRUNCATED_BANNER, metricSourceChartSeries } from '$lib/metricsource'

	interface Props {
		project: string
		source: Api.MetricSourceItem
		seriesItems?: Api.MetricSourceSeriesItem[]
	}

	const { project, source, seriesItems }: Props = $props()

	let range = $state('1h')
	let selected = $state<string[]>([])
	let items = $state<Api.UsageMetricsLine[]>([])
	let fetchedSeries = $state<Api.MetricSourceSeriesItem[]>([])
	let loading = $state(true)
	let queryError = $state('')
	let refreshTimer: ReturnType<typeof setTimeout> | undefined

	const seriesList = $derived(seriesItems ?? fetchedSeries)
	const seriesOptions = $derived(seriesList.map((s) => ({
		value: s.series,
		label: s.series
	})))
	const chartSeries = $derived(metricSourceChartSeries(items))
	const isEmpty = $derived(!loading && items.length === 0 && !queryError)

	function scheduleRefresh () {
		clearTimeout(refreshTimer)
		if (RANGE_SECONDS[range] <= RANGE_SECONDS['1d']) {
			refreshTimer = setTimeout(fetchQuery, 60 * 1000)
		}
	}

	async function fetchQuery () {
		const r = untrack(() => range)
		const s = untrack(() => selected)
		const name = untrack(() => source.name)
		await queryFor(name, s.join('\0'), r)
	}

	async function queryFor (name: string, seriesKey: string, timeRange?: string) {
		loading = true
		queryError = ''
		const r = timeRange ?? untrack(() => range)
		const s = seriesKey === '' ? [] : seriesKey.split('\0')
		try {
			const res = await api.invoke<Api.MetricSourceQueryResult>('metricSource.query', {
				project,
				name,
				series: s,
				timeRange: r
			}, fetch)
			if (!res.ok) {
				queryError = res.error?.message ?? 'query failed'
				items = []
				return
			}
			items = res.result?.items ?? []
		} finally {
			loading = false
			scheduleRefresh()
		}
	}

	async function loadSeriesFor (name: string) {
		if (seriesItems) {
			fetchedSeries = seriesItems
			return
		}
		const res = await api.invoke<Api.MetricSourceSeriesResult>('metricSource.series', {
			project,
			name
		}, fetch)
		fetchedSeries = res.result?.items ?? []
	}

	function selectRange (r: string) {
		if (r === range) return
		range = r
		items = []
		fetchQuery()
	}

	$effect(() => {
		if (!browser) return
		loadSeriesFor(source.name)
	})

	$effect(() => {
		if (!browser) return
		queryFor(source.name, selected.join('\0'))
		return () => clearTimeout(refreshTimer)
	})
</script>

{#if source.truncated}
	<div class="banner is-warning" role="status">
		<i class="fa-solid fa-triangle-exclamation"></i>
		<span>{TRUNCATED_BANNER}</span>
	</div>
{/if}
{#if source.lastError}
	<div class="banner is-negative" role="alert">
		<i class="fa-solid fa-circle-exclamation"></i>
		<span>{source.lastError}</span>
	</div>
{/if}
{#if queryError}
	<div class="banner is-negative" role="alert">
		<i class="fa-solid fa-circle-exclamation"></i>
		<span>{queryError}</span>
	</div>
{/if}

<div class="toolbar">
	<div class="field series-field">
		<label for="input-chart-series">Series</label>
		<OptionSelect
			id="input-chart-series"
			multi
			bind:tags={selected}
			options={seriesOptions}
			placeholder="All series (top by last seen)"
			emptyText="No series discovered yet" />
	</div>
	<RangeSwitch value={range} onselect={selectRange} />
</div>

{#if isEmpty}
	<div class="banner is-info" role="status">
		<i class="fa-solid fa-chart-line"></i>
		<span>No custom metric samples in this window</span>
	</div>
{:else}
	<Chart title={source.name} unit="count" series={chartSeries} {range} />
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.series-field {
		flex: 1;
		min-width: 16rem;
	}

	.banner {
		--tone: var(--hsl-content);
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border: 1px solid hsl(var(--tone) / 0.3);
		border-left-width: 3px;
		border-radius: 8px;
		background: hsl(var(--tone) / 0.06);
		font-size: 0.8125rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.85);
	}

	.banner i {
		color: hsl(var(--tone));
		margin-top: 0.1rem;
	}

	.banner.is-warning { --tone: var(--hsl-warning); }
	.banner.is-negative { --tone: var(--hsl-negative); }
	.banner.is-info { --tone: var(--hsl-primary); }
</style>
