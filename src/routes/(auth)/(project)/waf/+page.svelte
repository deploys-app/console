<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import Sparkline from '$lib/components/Sparkline.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const firewalls = $derived(data.firewalls)
	const error = $derived(data.error)

	const hasPending = $derived(firewalls.some((/** @type {Api.WafZone} */ fw) => fw.status === 'pending'))

	// While any zone is still being applied/removed by the deployer, poll waf.list
	// so the spinner resolves to its settled state on its own. Mirrors the
	// deployment detail polling pattern (api.intervalInvalidate in onMount).
	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPending) return
		await api.invalidate('waf.list')
	}, 3000))

	// Last 24h of match activity per location, shown as an inline sparkline +
	// total. Fetched client-side (one waf.metrics per zone, in parallel) so the
	// table renders immediately and the charts fill in.
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
		Promise.all(firewalls.map(async (/** @type {Api.WafZone} */ fw) => {
			metrics[fw.location] = { loading: true, total: 0, points: [] }

			/** @type {Api.Response<Api.WafMetricsResult>} */
			const res = await api.invoke('waf.metrics',
				{ project, location: fw.location, timeRange: '1d' }, fetch)

			metrics[fw.location] = {
				loading: false,
				total: res.result?.total ?? 0,
				points: aggregate(res.result?.series ?? [])
			}
		}))
	})

	// Collapse the per-(rule, action) series into one total-matches line: sum
	// every series' value at each timestamp, then sort by time.
	/**
	 * @param {Api.WafMetricsSeries[]} series
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
		<h4><strong>Firewall</strong></h4>
		<p class="page-sub">
			{firewalls.length} {firewalls.length === 1 ? 'firewall' : 'firewalls'}
		</p>
	</div>
	<a class="button is-icon-left" href={`/waf/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Create firewall
	</a>
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Location</th>
					<th>Status</th>
					<th>Description</th>
					<th>Rules</th>
					<th>Limits</th>
					<th>Matches (24h)</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each firewalls as fw (fw.location)}
					<tr>
						<td>
							<a href={`/waf/metrics?project=${project}&location=${encodeURIComponent(fw.location)}`} class="link font-mono">{fw.location}</a>
						</td>
						<td>
							{#if fw.status === 'pending'}
								<span class="inline-flex items-center gap-2 text-content/70">
									<i class="fa-solid fa-spinner-third fa-spin"></i>
									{fw.action === 'delete' ? 'Removing' : 'Deploying'}
								</span>
							{:else if fw.status === 'error'}
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
							{#if fw.description}
								{fw.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{fw.rules?.length ?? 0}</td>
						<td>{fw.limits?.length ?? 0}</td>
						<td>
							<!-- Reserve the loaded size in every state so the row/column keeps
							     its dimensions while the async sparkline fills in (no layout shift). -->
							<div class="matches-cell">
								{#if metrics[fw.location]?.loading}
									<span class="text-content/30"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
								{:else if (metrics[fw.location]?.total ?? 0) > 0}
									<a class="matches-link flex items-center gap-3"
										href={`/waf/metrics?project=${project}&location=${encodeURIComponent(fw.location)}`}
										title={`${metrics[fw.location].total.toLocaleString()} matches in the last 24h — view metrics`}>
										<span class="font-mono text-sm tabular-nums">
											{format.count(metrics[fw.location].total)}
										</span>
										<Sparkline points={metrics[fw.location].points} {from} {to} />
									</a>
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="button is-variant-secondary is-size-small"
									href={`/waf/manage?project=${project}&location=${encodeURIComponent(fw.location)}`}>
									Manage
								</a>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={7}
					list={firewalls}
					icon="fa-shield-halved"
					message="No firewalls yet"
					hint="Create a firewall to start filtering traffic in a location."
					ctaLabel="Create firewall"
					ctaHref={`/waf/create?project=${project}`} />
				<ErrorRow span={7} {error} />
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

	/* The matches total + sparkline doubles as a shortcut into the metrics view. */
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
