<script lang="ts">
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import Sparkline from '$lib/components/Sparkline.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafCopyModal from '$lib/components/WafCopyModal.svelte'
	import { onMount, untrack } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const firewalls = $derived(data.firewalls)
	const error = $derived(data.error)

	let copyModal = $state<WafCopyModal>()

	const { can } = getPermissionContext()
	$effect(() => {
		const actions = [{
			id: 'waf-list:lists',
			label: 'IP lists',
			icon: 'fa-list',
			keywords: 'waf firewall ip lists allowlist blocklist cidr',
			href: `/waf/lists?project=${project}`
		}]
		if (can('waf.set')) {
			actions.unshift({
				id: 'waf-list:create',
				label: 'Create firewall',
				icon: 'fa-plus',
				keywords: 'create new add firewall waf',
				href: `/waf/create?project=${project}`
			})
		}
		return registerPageActions(actions)
	})

	const hasPending = $derived(firewalls.some((fw: Api.WafZone) => fw.status === 'pending'))

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
	interface Metrics {
		loading: boolean
		total: number
		points: [number, number][]
	}
	const metrics = $state<Record<string, Metrics>>({})

	// Fixed 24h x-domain so bars sit at the right time-of-day even when the zone
	// only has a few active minutes.
	const to = Math.floor(Date.now() / 1000)
	const from = to - 24 * 60 * 60

	// Refetch the per-zone sparklines when the project changes. A project switch
	// navigates to /waf via goto (overrideRedirect) WITHOUT remounting this page,
	// so an onMount fetch would keep showing the previous project's matches —
	// worse, `metrics` is keyed by location only, so a shared location id would
	// render the OLD project's count. Track `project` in an $effect instead;
	// `firewalls` is read through untrack so the 3s waf.list poll (which replaces
	// the array while a zone is pending) doesn't re-trigger a fetch storm. Reset
	// the map first so a location the new project lacks can't show a stale entry.
	$effect(() => {
		const p = project
		untrack(() => {
			for (const k of Object.keys(metrics)) delete metrics[k]
			Promise.all(firewalls.map(async (fw: Api.WafZone) => {
				metrics[fw.location] = { loading: true, total: 0, points: [] }

				const res = await api.invoke<Api.WafMetricsResult>('waf.metrics',
					{ project: p, location: fw.location, timeRange: '1d' }, fetch)

				metrics[fw.location] = {
					loading: false,
					total: res.result?.total ?? 0,
					points: aggregate(res.result?.series ?? [])
				}
			}))
		})
	})

	// Collapse the per-(rule, action) series into one total-matches line: sum
	// every series' value at each timestamp, then sort by time.
	function aggregate (series: Api.WafMetricsSeries[]): [number, number][] {
		const byTs: Record<number, number> = {}
		for (const s of series) {
			for (const [ts, v] of s.points ?? []) {
				byTs[ts] = (byTs[ts] ?? 0) + v
			}
		}
		return Object.entries(byTs)
			.map(([ts, v]) => ([Number(ts), v] as [number, number]))
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
	<div class="flex flex-wrap gap-2">
		<a class="button is-variant-secondary is-icon-left" href={`/waf/lists?project=${project}`}>
			<i class="fa-solid fa-list"></i>
			IP lists
		</a>
		<GuardedButton permission="waf.set" class="button is-icon-left" href={`/waf/create?project=${project}`}>
			<i class="fa-solid fa-plus"></i>
			Create firewall
		</GuardedButton>
	</div>
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
								<GuardedButton permission={['waf.set', 'waf.list']} class="button is-variant-secondary is-size-small"
									aria-label={`Copy firewall in ${fw.location}`}
									onclick={() => copyModal?.open(fw.location)}>
									Copy
								</GuardedButton>
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
					ctaHref={`/waf/create?project=${project}`}
					{error} />
				<ErrorRow span={7} {error} />
			</tbody>
		</table>
	</div>
</div>

<WafCopyModal bind:this={copyModal} {project} locations={data.locations} />

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
