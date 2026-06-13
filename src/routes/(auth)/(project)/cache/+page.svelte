<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import Sparkline from '$lib/components/Sparkline.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const zones = $derived(data.zones)
	const error = $derived(data.error)

	const hasPending = $derived(zones.some((/** @type {Api.CacheZone} */ z) => z.status === 'pending'))

	// While any zone is still being applied/removed by the deployer, poll
	// cache.list so the spinner resolves to its settled state on its own. Mirrors
	// the WAF list polling pattern (api.intervalInvalidate in onMount).
	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPending) return
		await api.invalidate('cache.list')
	}, 3000))

	// Last 24h of cache decision activity per location, shown as an inline
	// sparkline + total. Fetched client-side (one cache.metrics per zone, in
	// parallel) so the table renders immediately and the charts fill in.
	/**
	 * @typedef {Object} Metrics
	 * @property {boolean} loading
	 * @property {number} total
	 * @property {[number, number][]} points
	 */
	/** @type {Record<string, Metrics>} */
	const metrics = $state({})

	// Fixed 24h x-domain so bars sit at the right time-of-day even when the zone
	// only has a few active minutes.
	const to = Math.floor(Date.now() / 1000)
	const from = to - 24 * 60 * 60

	onMount(() => {
		Promise.all(zones.map(async (/** @type {Api.CacheZone} */ z) => {
			metrics[z.location] = { loading: true, total: 0, points: [] }

			/** @type {Api.Response<Api.CacheMetricsResult>} */
			const res = await api.invoke('cache.metrics',
				{ project, location: z.location, timeRange: '1d' }, fetch)

			metrics[z.location] = {
				loading: false,
				total: res.result?.total ?? 0,
				points: aggregate(res.result?.series ?? [])
			}
		}))
	})

	// Collapse the per-(override, action, result) series into one total-decisions
	// line: sum every series' value at each timestamp, then sort by time.
	/**
	 * @param {Api.CacheMetricsSeries[]} series
	 * @returns {[number, number][]}
	 */
	function aggregate (series) {
		/** @type {Record<number, number>} */
		const byTs = {}
		for (const s of series) {
			for (const [ts, v] of s.points ?? []) {
				byTs[ts] = (byTs[ts] ?? 0) + v
			}
		}
		return Object.entries(byTs)
			.map(([ts, v]) => /** @type {[number, number]} */ ([Number(ts), v]))
			.sort((a, b) => a[0] - b[0])
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Cache</strong></h4>
		<p class="page-sub">
			{zones.length} {zones.length === 1 ? 'cache zone' : 'cache zones'}
		</p>
	</div>
	<GuardedButton permission="cache.set" class="button is-icon-left" href={`/cache/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Configure cache
	</GuardedButton>
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Location</th>
					<th>Status</th>
					<th>Description</th>
					<th>Overrides</th>
					<th>Decisions (24h)</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each zones as zone (zone.location)}
					<tr>
						<td>
							<a href={`/cache/metrics?project=${project}&location=${encodeURIComponent(zone.location)}`} class="link font-mono">{zone.location}</a>
						</td>
						<td>
							{#if zone.status === 'pending'}
								<span class="inline-flex items-center gap-2 text-content/70">
									<i class="fa-solid fa-spinner-third fa-spin"></i>
									{zone.action === 'delete' ? 'Removing' : 'Deploying'}
								</span>
							{:else if zone.status === 'error'}
								<span class="inline-flex items-center gap-2 text-negative/80">
									<i class="fa-solid fa-times"></i>
									Error
								</span>
							{:else}
								<span class="inline-flex items-center gap-2 text-positive/80">
									<i class="fa-solid fa-check-circle"></i>
									Active
								</span>
							{/if}
						</td>
						<td>
							{#if zone.description}
								{zone.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{zone.overrides?.length ?? 0}</td>
						<td>
							<!-- Reserve the loaded size in every state so the row/column keeps
							     its dimensions while the async sparkline fills in (no layout shift). -->
							<div class="matches-cell">
								{#if metrics[zone.location]?.loading}
									<span class="text-content/30"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
								{:else if (metrics[zone.location]?.total ?? 0) > 0}
									<a class="matches-link flex items-center gap-3"
										href={`/cache/metrics?project=${project}&location=${encodeURIComponent(zone.location)}`}
										title={`${metrics[zone.location].total.toLocaleString()} cache decisions in the last 24h — view metrics`}>
										<span class="font-mono text-sm tabular-nums">
											{format.count(metrics[zone.location].total)}
										</span>
										<Sparkline points={metrics[zone.location].points} {from} {to} />
									</a>
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="button is-variant-secondary is-size-small"
									href={`/cache/manage?project=${project}&location=${encodeURIComponent(zone.location)}`}>
									Manage
								</a>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={6}
					list={zones}
					icon="fa-bolt"
					message="No cache zones yet"
					hint="Configure cache to start overriding edge caching in a location."
					ctaLabel="Configure cache"
					ctaHref={`/cache/create?project=${project}`} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	/* Hold a fixed box across the loading / loaded / empty states: min-height
	   matches the Sparkline's height (28px) and min-width its count + chart, so
	   the row doesn't grow taller or the column wider when the chart loads. */
	.matches-cell {
		display: flex;
		align-items: center;
		min-height: 28px;
		min-width: 10rem;
	}

	/* The decisions total + sparkline doubles as a shortcut into the metrics view. */
	.matches-link {
		width: fit-content;
		color: inherit;
		border-radius: 0.375rem;
		transition: color var(--timing-fastest) ease;
	}

	.matches-link:hover {
		color: hsl(var(--hsl-primary));
	}
</style>
