<script lang="ts">
	import type { PageData } from './$types'
	import type { LineSeries } from '$lib/charts/util'
	import { untrack } from 'svelte'
	import { page } from '$app/stores'
	import { replaceState } from '$app/navigation'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'
	import { actionLabels } from '$lib/waf/rules'
	import { describeKey, modeLabels } from '$lib/waf/limits'
	import { countryName } from '$lib/waf/countries'
	import { RANGE_SECONDS, RANGE_LABEL, BUCKET_SECONDS } from '$lib/metrics'
	import RangeSwitch from '$lib/components/RangeSwitch.svelte'
	import WafActivityChart from '$lib/components/WafActivityChart.svelte'
	import LineChart from '$lib/components/LineChart.svelte'
	import Select from '$lib/components/Select.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const managePath = $derived(`/waf/manage?project=${project}&location=${encodeURIComponent(location)}`)

	// Rule id → its configured description/action, so the top-rules table reads
	// in human terms rather than raw ids.
	const ruleMeta = $derived(new Map(
		(data.zone?.rules ?? []).map((r: Api.WafRule) => [r.id, r])
	))

	// Configured limits drive the rate-limit section: no limits, no section.
	const limits = $derived((data.zone?.limits ?? []) as Api.WafLimit[])
	const hasLimits = $derived(limits.length > 0)

	// Stacks render block on top of log on top of allow — most-severe last so it
	// sits at the top of the column.
	const ACTION_ORDER: Api.WafAction[] = ['allow', 'log', 'block']

	const initialRange = $page.url.searchParams.get('range')
	let range = $state(initialRange && RANGE_SECONDS[initialRange] ? initialRange : '1d')

	let loading = $state(true)
	let result = $state<Api.WafMetricsResult | null>(null)
	let limitResult = $state<Api.WafLimitMetricsResult | null>(null)
	// Anchor the time window to the moment of the latest fetch so the chart grid
	// and "as of" line agree.
	let fetchedAt = $state(Math.floor(Date.now() / 1000))

	let refreshTimer: ReturnType<typeof setTimeout> | undefined

	async function fetchMetrics () {
		loading = true
		// `range` is read untracked so the project+location-keyed effect below
		// isn't also triggered by range changes — those refetch via selectRange.
		const r = untrack(() => range)
		try {
			const args = { project, location, timeRange: r }
			const [res, limitRes] = await Promise.all([
				api.invoke<Api.WafMetricsResult>('waf.metrics', args, fetch),
				hasLimits
					? api.invoke<Api.WafLimitMetricsResult>('waf.limitMetrics', args, fetch)
					: Promise.resolve({ ok: true, result: { series: [], total: 0 } } as Api.Response<Api.WafLimitMetricsResult>)
			])
			if (!res.ok) {
				modal.error({ error: res.error })
				return
			}
			result = res.result ?? { series: [], total: 0 }
			limitResult = (limitRes.ok ? limitRes.result : null) ?? { series: [], total: 0 }
			fetchedAt = Math.floor(Date.now() / 1000)
		} finally {
			loading = false
			scheduleRefresh()
		}
	}

	// Live-refresh only short windows — minute-level polling is meaningless for a
	// 7d/30d view and just churns the chart.
	function scheduleRefresh () {
		clearTimeout(refreshTimer)
		if (RANGE_SECONDS[range] <= RANGE_SECONDS['1d']) {
			refreshTimer = setTimeout(fetchMetrics, 60 * 1000)
		}
	}

	function selectRange (r: string) {
		if (r === range) return
		range = r
		const u = new URL($page.url)
		u.searchParams.set('range', r)
		replaceState(u, {})
		result = null
		limitResult = null
		fetchMetrics()
	}

	// Fetch on mount and refetch whenever the project or location changes. A
	// project switch unmounts this detail page (overrideRedirect '/waf'), but the
	// WAF list links here per location, so /waf/metrics?location=A -> ?location=B
	// reuses this component WITHOUT remounting — an onMount-only fetch would leave
	// location A's tiles/charts/tables on a B header (and for 7d/30d no refresh
	// timer ever corrects it). fetchMetrics reads project + location synchronously,
	// so the effect tracks them (range is read untracked and refetched via
	// selectRange).
	$effect(() => {
		fetchMetrics()
		return () => clearTimeout(refreshTimer)
	})

	const total = $derived(result?.total ?? 0)

	// Totals per action, for the KPI tiles.
	const byAction = $derived.by(() => {
		const acc: Record<Api.WafAction, number> = { block: 0, log: 0, allow: 0 }
		for (const s of result?.series ?? []) {
			acc[s.action] = (acc[s.action] ?? 0) + s.total
		}
		return acc
	})

	const tiles = $derived([
		{ key: 'total', label: 'Total matches', value: total },
		{ key: 'block', label: 'Blocked', value: byAction.block },
		{ key: 'log', label: 'Logged', value: byAction.log },
		{ key: 'allow', label: 'Allowed', value: byAction.allow }
	])

	const windowFrom = $derived(fetchedAt - RANGE_SECONDS[range])

	// Bucket every series' sparse points onto a shared grid, summed per action,
	// so the stacked columns line up. Actions with no traffic in the window are
	// dropped from the chart.
	const chartSeries = $derived.by(() => {
		const bucket = BUCKET_SECONDS[range]
		const from = windowFrom
		const to = fetchedAt
		const n = Math.max(1, Math.ceil((to - from) / bucket))

		const grids: Record<Api.WafAction, number[]> = { block: new Array(n).fill(0), log: new Array(n).fill(0), allow: new Array(n).fill(0) }
		for (const s of result?.series ?? []) {
			const g = grids[s.action]
			if (!g) continue
			for (const [ts, v] of s.points ?? []) {
				const i = Math.floor((ts - from) / bucket)
				if (i >= 0 && i < n) g[i] += v
			}
		}

		return ACTION_ORDER
			.filter((action) => byAction[action] > 0)
			.map((action) => ({
				action,
				name: actionLabels[action] ?? action,
				data: grids[action].map((v, i) => [(from + i * bucket) * 1000, v]) as [number, number][]
			}))
	})

	// Rank rules by match volume. Each (rule, action) series collapses onto its
	// rule; the action of its largest series wins the badge.
	const topRules = $derived.by(() => {
		const byRule: Record<string, { ruleId: string, total: number, action: Api.WafAction, top: number }> = {}
		for (const s of result?.series ?? []) {
			const cur = byRule[s.ruleId]
			if (cur) {
				cur.total += s.total
				if (s.total > cur.top) {
					cur.top = s.total
					cur.action = s.action
				}
			} else {
				byRule[s.ruleId] = { ruleId: s.ruleId, total: s.total, action: s.action, top: s.total }
			}
		}
		return Object.values(byRule)
			.filter((r) => r.total > 0)
			.sort((a, b) => b.total - a.total)
	})

	function share (v: number) {
		return total > 0 ? v / total : 0
	}
	function pct (v: number) {
		return total > 0 ? `${Math.round((v / total) * 100)}%` : '—'
	}

	// Per-limit (allowed, limited) bucket counts, joined from the sparse series.
	const limitBuckets = $derived.by(() => {
		const byLimit: Record<string, { allowed: Record<number, number>, limited: Record<number, number> }> = {}
		for (const s of limitResult?.series ?? []) {
			const entry = byLimit[s.limitId] ??= { allowed: {}, limited: {} }
			const m = entry[s.result]
			if (!m) continue
			for (const [ts, v] of s.points ?? []) {
				m[ts] = (m[ts] ?? 0) + v
			}
		}
		return byLimit
	})

	// One share line per configured limit: limited / (allowed + limited) as a
	// percentage, over the union of that limit's bucket timestamps. A missing
	// series counts as 0, so a bucket with only limited traffic reads 100%.
	const limitShareSeries = $derived.by(() => {
		const out: LineSeries[] = []
		for (const limit of limits) {
			const entry = limitBuckets[limit.id]
			if (!entry) continue
			const xs = [...new Set([...Object.keys(entry.allowed), ...Object.keys(entry.limited)])]
				.map(Number)
				.sort((a, b) => a - b)
			if (!xs.length) continue
			const name = limit.description || limit.id
			out.push({
				name: limit.mode === 'shadow' ? `${name} · shadow` : name,
				dashed: limit.mode === 'shadow',
				points: xs.map((ts) => {
					const allowed = entry.allowed[ts] ?? 0
					const limited = entry.limited[ts] ?? 0
					const t = allowed + limited
					return { x: ts * 1000, y: t > 0 ? (limited / t) * 100 : 0 }
				})
			})
		}
		return out
	})

	// Summary rows — every configured limit gets one, with — when it saw no
	// traffic in the window.
	const limitRows = $derived(limits.map((limit) => {
		const entry = limitBuckets[limit.id]
		const sum = (m: Record<number, number> | undefined) =>
			Object.values(m ?? {}).reduce((acc, v) => acc + v, 0)
		const allowed = sum(entry?.allowed)
		const limited = sum(entry?.limited)
		const traffic = allowed + limited
		return { limit, allowed, limited, traffic, share: traffic > 0 ? (limited / traffic) * 100 : null }
	}))

	function sharePct (v: number) {
		return `${v >= 10 ? v.toFixed(1) : v.toFixed(2)}%`
	}

	const showSpinner = $derived(loading && !result)
	const isEmpty = $derived(!loading && total === 0)
	const limitSpinner = $derived(loading && !limitResult)
	const limitEmpty = $derived(!limitSpinner && limitShareSeries.length === 0)

	// --- Recent events -------------------------------------------------------
	// Sampled match events (waf.events), newest first, keyset-paginated with
	// `before`. Fetched client-side after hydration; filters are server-side
	// and mirrored in the query string (?ruleId=&action=) so a filtered view is
	// shareable — and so a DELETED rule's events stay reachable by hand-editing
	// ?ruleId=, which the rule select can't offer (it lists current rules only).

	const EVENTS_PAGE_SIZE = 50
	const EVENT_ACTIONS: Api.WafAction[] = ['log', 'allow', 'block']

	function isWafAction (s: string): s is Api.WafAction {
		return (EVENT_ACTIONS as string[]).includes(s)
	}

	// Writable $deriveds (admin#18 pattern): editable locally by the filter
	// selects, re-seeded whenever navigation changes the URL params.
	let eventRule = $derived($page.url.searchParams.get('ruleId') ?? '')
	let eventAction = $derived.by(() => {
		const a = $page.url.searchParams.get('action') ?? ''
		return isWafAction(a) ? a : ''
	})

	let events = $state<Api.WafEvent[]>([])
	let eventsNext = $state('')
	let eventsLoading = $state(true)
	let eventsMoreLoading = $state(false)
	let eventsError = $state<unknown>(null)
	// Bumped on every (re)fetch so a stale in-flight response (filter or
	// project/location changed underneath it) is discarded, not appended.
	let eventsToken = 0

	async function fetchEvents (reset: boolean) {
		const token = ++eventsToken
		if (reset) {
			eventsLoading = true
		} else {
			eventsMoreLoading = true
		}
		// Filters are read untracked: the events $effect below must key on
		// project+location only (filter changes refetch via applyEventFilters,
		// and range changes also rewrite $page.url — they must not refetch this).
		const ruleId = untrack(() => eventRule)
		const action = untrack(() => eventAction)
		const args: Api.WafEventsRequest = { project, location, limit: EVENTS_PAGE_SIZE }
		if (ruleId) args.ruleId = ruleId
		if (action && isWafAction(action)) args.action = action
		if (!reset && eventsNext) args.before = eventsNext
		try {
			const res = await api.invoke<Api.WafEventsResult>('waf.events', args, fetch)
			if (token !== eventsToken) return
			if (!res.ok) {
				eventsError = res.error
				return
			}
			const items = res.result?.items ?? []
			events = reset ? items : [...events, ...items]
			eventsNext = res.result?.next ?? ''
			eventsError = null
		} catch (e) {
			// api.invoke synthesizes an error envelope for non-JSON bodies but still
			// rejects when fetch itself fails (offline, connection reset). Without
			// this, the empty state would claim "No events in the last 3 days" —
			// a false statement about the data — on a plain network failure.
			if (token === eventsToken) eventsError = e
		} finally {
			if (token === eventsToken) {
				eventsLoading = false
				eventsMoreLoading = false
			}
		}
	}

	// Same params-keyed pattern as fetchMetrics: refetch when project/location
	// change (this page is reused across ?location= navigations without a
	// remount). fetchEvents reads project + location synchronously before its
	// first await, so the effect tracks them.
	$effect(() => {
		events = []
		eventsNext = ''
		fetchEvents(true)
	})

	// Reflect the filters into the URL, then refetch page 1. replaceState (not
	// goto): a filter tweak shouldn't grow history or re-run load().
	function applyEventFilters () {
		const u = new URL($page.url)
		if (eventRule) u.searchParams.set('ruleId', eventRule)
		else u.searchParams.delete('ruleId')
		if (eventAction) u.searchParams.set('action', eventAction)
		else u.searchParams.delete('action')
		replaceState(u, {})
		events = []
		eventsNext = ''
		fetchEvents(true)
	}

	const eventRuleOptions = $derived.by(() => {
		const opts = [{ value: '', label: 'All rules' }]
		const rules = (data.zone?.rules ?? []) as Api.WafRule[]
		for (const r of rules) {
			opts.push({ value: r.id, label: r.description || r.id })
		}
		// A hand-edited ?ruleId= may name a rule that no longer exists — keep the
		// active filter visible in the select instead of showing a blank trigger.
		if (eventRule && !rules.some((r) => r.id === eventRule)) {
			opts.push({ value: eventRule, label: `${eventRule} (deleted)` })
		}
		return opts
	})

	const eventActionOptions = [
		{ value: '', label: 'All actions' },
		...EVENT_ACTIONS.map((a) => ({ value: a, label: actionLabels[a] ?? a }))
	]

	const eventsSpinner = $derived(eventsLoading && events.length === 0 && !eventsError)
	const eventsEmpty = $derived(!eventsLoading && !eventsError && events.length === 0)
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6 class="font-mono">{location}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Firewall activity</strong></h4>
		<p class="page-sub">
			Matches in <span class="font-mono">{location}</span> · {RANGE_LABEL[range]}
		</p>
	</div>
	<div class="head-actions">
		<RangeSwitch value={range} onselect={selectRange} />
		<a class="button is-variant-secondary is-icon-left" href={managePath}>
			<i class="fa-solid fa-sliders"></i>
			Manage rules
		</a>
	</div>
</div>

<div class="stat-grid">
	{#each tiles as tile (tile.key)}
		<div class="stat-tile" data-accent={tile.key}>
			<div class="stat-head">
				{#if tile.key !== 'total'}<span class="dot"></span>{/if}
				{tile.label}
			</div>
			<div class="stat-value">
				{#if showSpinner}
					<span class="text-content/25"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
				{:else}
					{format.count(tile.value)}
				{/if}
			</div>
			<div class="stat-foot">
				{#if tile.key === 'total'}
					<span>across {topRules.length} {topRules.length === 1 ? 'rule' : 'rules'}</span>
				{:else}
					<span class="share-bar"><span style={`width:${share(tile.value) * 100}%`}></span></span>
					<span class="tabular-nums">{pct(tile.value)}</span>
				{/if}
			</div>
		</div>
	{/each}
</div>

<div class="panel is-level-300 chart-panel">
	<div class="panel-head">
		<h6><strong>Matches over time</strong></h6>
		<div class="legend">
			{#each ['block', 'log', 'allow'] as action (action)}
				<span class="legend-item" data-action={action}>
					<span class="legend-dot"></span>
					{actionLabels[action]}
				</span>
			{/each}
		</div>
	</div>

	<div class="chart-body">
		{#if showSpinner}
			<div class="chart-state text-content/40">
				<i class="fa-solid fa-spinner-third fa-spin text-2xl"></i>
			</div>
		{:else if isEmpty}
			<div class="chart-state">
				<i class="fa-solid fa-shield-halved empty-icon"></i>
				<p class="empty-title">No matches in this window</p>
				<p class="empty-sub">Traffic is flowing clean — no rule has fired in the {RANGE_LABEL[range]}.</p>
			</div>
		{:else}
			<WafActivityChart series={chartSeries} from={windowFrom * 1000} to={fetchedAt * 1000} />
		{/if}
	</div>
</div>

{#if !isEmpty}
	<div class="panel is-level-300">
		<div class="panel-head">
			<h6><strong>Top rules</strong></h6>
			<span class="page-sub">by match volume</span>
		</div>
		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Rule</th>
						<th>Action</th>
						<th class="is-align-right">Matches</th>
						<th class="share-col">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each topRules as rule (rule.ruleId)}
						{@const meta = ruleMeta.get(rule.ruleId)}
						{@const action = meta?.action ?? rule.action}
						<tr>
							<td>
								<div class="rule-cell">
									{#if meta?.description}
										<span class="rule-desc">{meta.description}</span>
									{/if}
									<span class="font-mono text-sm text-content/55">{rule.ruleId}</span>
								</div>
							</td>
							<td>
								<span class="act-badge" data-action={action}>{actionLabels[action] ?? action}</span>
							</td>
							<td class="is-align-right font-mono tabular-nums">{rule.total.toLocaleString()}</td>
							<td class="share-col">
								<div class="row-share">
									<span class="share-bar" data-action={action}>
										<span style={`width:${share(rule.total) * 100}%`}></span>
									</span>
									<span class="tabular-nums text-content/60">{pct(rule.total)}</span>
								</div>
							</td>
						</tr>
					{/each}
					{#if showSpinner}
						<tr><td colspan="4" class="text-center text-content/40">
							<i class="fa-solid fa-spinner-third fa-spin"></i>
						</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<div class="panel is-level-300 events-panel">
	<div class="panel-head events-head">
		<div>
			<h6><strong>Recent events</strong></h6>
			<p class="page-sub">
				Sampled — a bounded number of events per firewall (up to 60/min per
				ingress instance) is kept for 3 days. Counts in the chart above are exact.
			</p>
		</div>
		<div class="events-filters">
			<Select
				id="events-filter-rule"
				bind:value={eventRule}
				options={eventRuleOptions}
				onchange={applyEventFilters} />
			<Select
				id="events-filter-action"
				bind:value={eventAction}
				options={eventActionOptions}
				onchange={applyEventFilters} />
		</div>
	</div>

	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Time</th>
					<th>Action</th>
					<th>Rule</th>
					<th>IP</th>
					<th>Country</th>
					<th>Method</th>
					<th>Host</th>
					<th>Path</th>
				</tr>
			</thead>
			<tbody>
				{#each events as ev (ev.id)}
					{@const meta = ruleMeta.get(ev.ruleId)}
					<tr>
						<td class="whitespace-nowrap" title={format.datetime(ev.at)}>{format.fromNow(ev.at)}</td>
						<td>
							<span class="act-badge" data-action={ev.action}>{actionLabels[ev.action] ?? ev.action}</span>
						</td>
						<td>
							{#if meta}
								<a
									class="link font-mono text-sm"
									href={`${managePath}#waf-rule-${encodeURIComponent(ev.ruleId)}`}
									title={meta.description || ev.ruleId}>{ev.ruleId}</a>
							{:else}
								<!-- Events outlive rules by up to 3 days (and waf.set
								     regenerates unknown ids) — never a dead link. -->
								<span class="font-mono text-sm text-content/55" title="rule no longer exists">{ev.ruleId}</span>
							{/if}
						</td>
						<td class="font-mono text-sm whitespace-nowrap">{ev.clientIp}</td>
						<td class="whitespace-nowrap">
							{#if ev.country}
								{countryName(ev.country)}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td class="font-mono text-sm">{ev.method}</td>
						<td class="font-mono text-sm event-trunc" title={ev.host}>{ev.host}</td>
						<td class="font-mono text-sm event-trunc" title={ev.path}>{ev.path}</td>
					</tr>
				{/each}
				{#if eventsSpinner}
					<tr><td colspan="8" class="text-center text-content/40">
						<i class="fa-solid fa-spinner-third fa-spin"></i>
					</td></tr>
				{/if}
				<!-- Not ErrorRow: its retry re-runs load(), which can't reach this
				     client-side fetch — retry here re-invokes waf.events directly. -->
				{#if eventsError}
					<tr><td colspan="8">
						<div class="events-error" title={(eventsError as { message?: string })?.message ?? ''}>
							<i class="fa-solid fa-exclamation-triangle text-warning"></i>
							<p class="text-content/70">Something went wrong while loading events. Please try again later.</p>
							<!-- When pages are already loaded the failure was a "Load more" —
							     retry re-issues the cursor fetch instead of discarding them. -->
							<button
								type="button"
								class="button is-variant-secondary is-size-small"
								class:is-loading={eventsLoading || eventsMoreLoading}
								onclick={() => fetchEvents(events.length === 0)}>
								Try again
							</button>
						</div>
					</td></tr>
				{/if}
				{#if eventsEmpty}
					<NoDataRow span={8} icon="fa-shield-halved" message="No events in the last 3 days." />
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Suppressed while the error row shows: a failed "Load more" keeps the old
	     cursor, and two competing buttons (one of which used to discard every
	     loaded page) is worse than the single retry affordance. -->
	{#if eventsNext && !eventsError}
		<div class="events-more">
			<button
				type="button"
				class="button is-variant-secondary is-size-small"
				class:is-loading={eventsMoreLoading}
				onclick={() => fetchEvents(false)}>
				Load more
			</button>
		</div>
	{/if}
</div>

{#if hasLimits}
	<div class="panel is-level-300 limit-panel">
		<div class="panel-head">
			<div>
				<h6><strong>Rate limit activity</strong></h6>
				<p class="page-sub">Share of requests over each limit — size shadow limits here before enforcing them.</p>
			</div>
		</div>

		<div class="limit-chart-body">
			{#if limitSpinner}
				<div class="chart-state limit-state text-content/40">
					<i class="fa-solid fa-spinner-third fa-spin text-2xl"></i>
				</div>
			{:else if limitEmpty}
				<div class="chart-state limit-state">
					<i class="fa-solid fa-gauge-high empty-icon"></i>
					<p class="empty-title">No rate limit activity in this range.</p>
					<p class="empty-sub">No request hit a configured limit's bucket in the {RANGE_LABEL[range]}.</p>
				</div>
			{:else}
				<LineChart
					series={limitShareSeries}
					xType="time"
					xDomain={[windowFrom * 1000, fetchedAt * 1000]}
					height={280}
					formatY={(v) => `${format.count(v)}%`}
					formatValue={(v) => sharePct(v)}
					legend />
			{/if}
		</div>

		<div class="table-container limit-table">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Limit</th>
						<th>Mode</th>
						<th class="is-align-right">Allowed</th>
						<th class="is-align-right">Limited</th>
						<th class="is-align-right">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each limitRows as row (row.limit.id)}
						<tr>
							<td>
								<div class="rule-cell">
									<span class="rule-desc">{row.limit.description || row.limit.id}</span>
									<span class="text-sm text-content/55">{describeKey(row.limit.key)} · {row.limit.rate} / {row.limit.window}</span>
								</div>
							</td>
							<td>
								<span class="mode-badge" data-mode={row.limit.mode ?? 'enforce'}>
									{modeLabels[row.limit.mode ?? 'enforce'] ?? row.limit.mode}
								</span>
							</td>
							<td class="is-align-right font-mono tabular-nums">
								{#if row.traffic > 0}
									{row.allowed.toLocaleString()}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td class="is-align-right">
								{#if row.traffic > 0}
									<span class="font-mono tabular-nums">{row.limited.toLocaleString()}</span>
									{#if row.limit.mode === 'shadow'}
										<span class="text-sm text-content/45">would be limited</span>
									{/if}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td class="is-align-right font-mono tabular-nums">
								{#if row.share != null}
									{sharePct(row.share)}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<style>
	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Segmented time-range control. */
	/* KPI tiles — colored by what the firewall decided. */
	.stat-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-bottom: 1rem;
	}

	@media (min-width: 1024px) {
		.stat-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.stat-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1rem 1.125rem;
		border-radius: 0.75rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
		overflow: hidden;
	}

	.stat-tile::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 3px;
		background: var(--accent, hsl(var(--hsl-content) / 0.2));
	}

	.stat-tile[data-accent='block'] { --accent: hsl(var(--hsl-negative)); }
	.stat-tile[data-accent='log'] { --accent: hsl(var(--hsl-warning)); }
	.stat-tile[data-accent='allow'] { --accent: hsl(var(--hsl-positive)); }

	.stat-tile[data-accent='total'] {
		background: linear-gradient(135deg, hsl(var(--hsl-primary) / 0.12) 0%, hsl(var(--hsl-accent) / 0.12) 100%);
		border-color: hsl(var(--hsl-primary) / 0.2);
	}

	.stat-tile[data-accent='total']::before {
		background: linear-gradient(hsl(var(--hsl-primary)), hsl(var(--hsl-accent)));
	}

	.stat-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.stat-head .dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--accent);
	}

	.stat-value {
		font-size: 1.9rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-content));
	}

	.stat-tile[data-accent='total'] .stat-value {
		color: hsl(var(--hsl-primary));
	}

	.stat-foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	/* Shared mini bar — fill color follows the row/tile action accent. */
	.share-bar {
		flex: 1;
		height: 0.3125rem;
		min-width: 2rem;
		border-radius: 9999px;
		background: hsl(var(--hsl-content) / 0.08);
		overflow: hidden;
	}

	.share-bar > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--accent, hsl(var(--hsl-primary)));
		transition: width var(--timing-normal) ease;
	}

	.stat-tile[data-accent='block'] .share-bar > span { background: hsl(var(--hsl-negative)); }
	.stat-tile[data-accent='log'] .share-bar > span { background: hsl(var(--hsl-warning)); }
	.stat-tile[data-accent='allow'] .share-bar > span { background: hsl(var(--hsl-positive)); }

	.share-bar[data-action='block'] > span { background: hsl(var(--hsl-negative)); }
	.share-bar[data-action='log'] > span { background: hsl(var(--hsl-warning)); }
	.share-bar[data-action='allow'] > span { background: hsl(var(--hsl-positive)); }

	/* Panels */
	.panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.chart-panel {
		margin-bottom: 1rem;
	}

	.chart-body {
		min-height: 320px;
	}

	.chart-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 320px;
		text-align: center;
	}

	.chart-state .empty-icon {
		font-size: 1.75rem;
		color: hsl(var(--hsl-positive) / 0.6);
	}

	.chart-state .empty-title {
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.8);
	}

	.chart-state .empty-sub {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
		max-width: 22rem;
	}

	/* Chart legend */
	.legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.legend-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 0.25rem;
	}

	.legend-item[data-action='block'] .legend-dot { background: hsl(var(--hsl-negative)); }
	.legend-item[data-action='log'] .legend-dot { background: hsl(var(--hsl-warning)); }
	.legend-item[data-action='allow'] .legend-dot { background: hsl(var(--hsl-positive)); }

	/* Top-rules table */
	.rule-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.rule-desc {
		font-weight: 500;
	}

	.share-col {
		width: 30%;
		min-width: 9rem;
	}

	.row-share {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.75rem;
	}

	.act-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.act-badge[data-action='block'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.act-badge[data-action='log'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.14);
	}

	.act-badge[data-action='allow'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	/* Recent events */
	.events-panel {
		margin-top: 1rem;
	}

	.events-head {
		align-items: flex-start;
	}

	.events-filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Select defaults to width:100% (form layouts) — pin the filters to a
	   readable fixed width so they sit side by side in the panel head. */
	.events-filters :global(.select-box) {
		width: 12rem;
	}

	/* Attacker-chosen strings — cap the cell, full value in the title. */
	.event-trunc {
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.events-more {
		display: flex;
		justify-content: center;
		margin-top: 0.75rem;
	}

	.events-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		text-align: center;
	}

	/* Rate limit activity */
	.limit-panel {
		margin-top: 1rem;
	}

	.limit-chart-body {
		min-height: 280px;
	}

	.limit-state {
		min-height: 280px;
	}

	.limit-table {
		margin-top: 1rem;
	}

	/* Same badge as the manage page's limits table. */
	.mode-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	/* Shadow only observes — render it muted so Enforce stands out. */
	.mode-badge[data-mode='shadow'] {
		color: hsl(var(--hsl-content) / 0.5);
		background-color: hsl(var(--hsl-content) / 0.05);
	}
</style>
