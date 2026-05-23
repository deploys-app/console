<script>
	import { page } from '$app/stores'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { onMount } from 'svelte'
	import Highcharts from 'highcharts'
	import * as hc from '$lib/hc'
	import api from '$lib/api'

	const { data } = $props()

	const billingAccount = $derived(data.billingAccount)

	const filter = $state({
		range: $page.url.searchParams.get('range') || 'this_month',
		projectSids: []
	})

	let report = $state()
	let loading = $state(false)

	let filterOpen = $state(false)
	let filterSearch = $state('')

	const projectListLen = $derived((report?.projectList ?? []).length)

	const selectedLabel = $derived.by(() => {
		const n = filter.projectSids.length
		const total = projectListLen
		if (total === 0) return 'No projects'
		if (n === total) return `All ${total} projects`
		if (n === 0) return `0 of ${total} projects`
		return `${n} of ${total} projects`
	})

	const filteredProjects = $derived.by(() => {
		const list = report?.projectList ?? []
		const q = filterSearch.trim().toLowerCase()
		if (!q) return list
		return list.filter((p) =>
			(p.name || '').toLowerCase().includes(q) ||
			(p.sid || '').toLowerCase().includes(q)
		)
	})

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let fetchTimer
	function scheduleFetch () {
		if (fetchTimer) clearTimeout(fetchTimer)
		fetchTimer = setTimeout(() => {
			fetchTimer = undefined
			fetchReport()
		}, 300)
	}

	function selectAllProjects () {
		filter.projectSids = (report?.projectList ?? []).map((p) => p.sid)
		scheduleFetch()
	}

	function clearAllProjects () {
		filter.projectSids = []
		scheduleFetch()
	}

	/** @param {HTMLElement} node @param {() => void} handler */
	function clickOutside (node, handler) {
		/** @param {MouseEvent} e */
		function onDown (e) {
			if (e.target instanceof Node && !node.contains(e.target)) {
				handler()
			}
		}
		document.addEventListener('mousedown', onDown)
		return {
			destroy () {
				document.removeEventListener('mousedown', onDown)
			}
		}
	}

	/** @param {HTMLElement} node */
	function autofocus (node) {
		queueMicrotask(() => node.focus())
	}

	const rangeOptions = [
		{ value: 'this_month', label: 'This month' },
		{ value: 'prev_month', label: 'Previous month' },
		{ value: '3_months', label: '3 months' },
		{ value: '6_months', label: '6 months' },
		{ value: 'year', label: '1 year' }
	]

	const totals = $derived.by(() => {
		const list = report?.list ?? []
		return {
			usage: list.reduce((s, it) => s + (it.usageValue ?? 0), 0),
			billing: list.reduce((s, it) => s + (it.billingValue ?? 0), 0)
		}
	})

	const projectNameBySid = $derived.by(() => {
		/** @type {Record<string, string>} */
		const map = {}
		for (const it of (report?.projectList ?? [])) {
			map[it.sid] = it.name
		}
		return map
	})

	/** @param {number} v */
	function money (v) {
		return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	}

	/** @param {number} v */
	function num (v) {
		return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
	}

	async function fetchReport () {
		loading = true
		try {
			const resp = await api.invoke('billing.report', {
				id: billingAccount.id,
				range: filter.range,
				projectSids: filter.projectSids ?? []
			}, fetch)
			if (!resp.ok) {
				return
			}
			report = resp.result

			filter.projectSids = report.projectSids ?? []
			initChart()
		} finally {
			loading = false
		}
	}

	/** @type {HTMLElement} */
	let chartEl
	let chart = null

	function initChart () {
		chart?.destroy()
		if (!chartEl) return
		chart = Highcharts.chart(chartEl, {
			chart: {
				type: 'spline',
				backgroundColor: 'transparent',
				scrollablePlotArea: {
					minWidth: 600,
					scrollPositionX: 1
				}
			},
			title: { text: '' },
			xAxis: {
				categories: report.chart.categories
			},
			yAxis: {
				title: { text: 'Cost (THB)' }
			},
			tooltip: { valueSuffix: ' THB', valueDecimals: 2 },
			plotOptions: {
				spline: {
					lineWidth: 1,
					states: { hover: { lineWidth: 3 } },
					marker: { enabled: false }
				}
			},
			series: report.chart.series,
			responsive: {
				rules: [{
					condition: { maxWidth: 500 },
					chartOptions: {
						legend: {
							layout: 'horizontal',
							align: 'center',
							verticalAlign: 'bottom'
						}
					}
				}]
			}
		})
	}

	/** @param {string} v */
	function selectRange (v) {
		filter.range = v
		fetchReport()
	}

	onMount(() => {
		hc.init()
		fetchReport()
		return () => { chart?.destroy() }
	})
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href="/billing" class="link"><h6>Billing</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6 class="min-w-0 wrap-anywhere">{billingAccount.name}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Report</h6>
	</div>
</div>

<br>

<div class="grid gap-6">
	<div class="panel is-level-300 grid gap-5">
		<div class="grid gap-2">
			<span class="filter-label">Date range</span>
			<div class="range-group">
				{#each rangeOptions as opt (opt.value)}
					<button type="button"
						class="range-pill"
						class:is-active={filter.range === opt.value}
						onclick={() => selectRange(opt.value)}>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		{#if (report?.projectList ?? []).length > 0}
			<div class="grid gap-2">
				<span class="filter-label">Projects</span>
				<div class="project-filter">
					<button type="button" class="project-trigger" onclick={() => (filterOpen = !filterOpen)}>
						<span>{selectedLabel}</span>
						<i class="fa-solid fa-chevron-down" class:is-open={filterOpen}></i>
					</button>
					{#if filterOpen}
						<div class="project-popover" use:clickOutside={() => (filterOpen = false)}>
							<div class="project-popover-head">
								<div class="input -has-icon-left">
									<span class="icon -is-left"><i class="fa-solid fa-magnifying-glass"></i></span>
									<input
										type="text"
										placeholder="Search projects…"
										bind:value={filterSearch}
										use:autofocus
										onkeydown={(e) => { if (e.key === 'Escape') filterOpen = false }}>
								</div>
								<div class="project-popover-bulk">
									<button type="button" class="link" onclick={selectAllProjects}>Select all</button>
									<span class="text-content/40">·</span>
									<button type="button" class="link" onclick={clearAllProjects}>Clear</button>
								</div>
							</div>
							<div class="project-popover-list">
								{#each filteredProjects as it (it.sid)}
									<label class="project-row">
										<input
											type="checkbox"
											value={it.sid}
											bind:group={filter.projectSids}
											onchange={scheduleFetch}>
										<div class="grid min-w-0">
											<span class="truncate">{it.name || it.sid}</span>
											{#if it.name && it.name !== it.sid}
												<span class="project-row-sid truncate">{it.sid}</span>
											{/if}
										</div>
									</label>
								{:else}
									<div class="project-popover-empty">No projects match.</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="summary-grid">
		<div class="summary-card is-primary">
			<div class="summary-label">Total billing</div>
			<div class="summary-value">
				<span class="summary-amount">{money(totals.billing)}</span>
				<span class="summary-currency">THB</span>
			</div>
		</div>
		<div class="summary-card">
			<div class="summary-label">Total usage</div>
			<div class="summary-value">
				<span class="summary-amount">{num(totals.usage)}</span>
			</div>
		</div>
		<div class="summary-card">
			<div class="summary-label">Projects in scope</div>
			<div class="summary-value">
				<span class="summary-amount">{(filter.projectSids ?? []).length}</span>
			</div>
		</div>
	</div>

	<div class="panel is-level-300">
		<div class="flex items-center justify-between mb-4">
			<h5><strong>Usage over time</strong></h5>
			{#if loading}
				<i class="fa-solid fa-spinner-third fa-spin text-content/60"></i>
			{/if}
		</div>
		{#if !report}
			<div class="chart-loading">
				<i class="fa-solid fa-spinner-third fa-spin"></i>
			</div>
		{/if}
		<div bind:this={chartEl} class="chart-container" class:is-hidden={!report}></div>
	</div>

	<div class="panel is-level-300">
		<h5 class="mb-4"><strong>Breakdown</strong></h5>
		<div class="table-container">
			<table class="table">
				<thead>
					<tr>
						<th>Project</th>
						<th>Resource</th>
						<th class="is-align-right">Usage</th>
						<th class="is-align-right">Billing (THB)</th>
					</tr>
				</thead>
				<tbody>
					{#each (report?.list ?? []) as it, i (i)}
						<tr>
							<td>
								<div class="grid">
									<span>{projectNameBySid[it.projectSid] || it.projectSid}</span>
									{#if projectNameBySid[it.projectSid] && projectNameBySid[it.projectSid] !== it.projectSid}
										<span class="row-subtext">{it.projectSid}</span>
									{/if}
								</div>
							</td>
							<td>{it.name}</td>
							<td class="is-align-right tabular">{num(it.usageValue)}</td>
							<td class="is-align-right tabular">{money(it.billingValue)}</td>
						</tr>
					{:else}
						<NoDataRow span={4} />
					{/each}
				</tbody>
				{#if (report?.list ?? []).length > 0}
					<tfoot>
						<tr>
							<td colspan="2"><strong>Total</strong></td>
							<td class="is-align-right tabular"><strong>{num(totals.usage)}</strong></td>
							<td class="is-align-right tabular"><strong>{money(totals.billing)}</strong></td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>
</div>

<style>
	.filter-label {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: hsl(var(--hsl-content) / 0.7);
		text-transform: uppercase;
	}

	.range-group {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 0.55rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.6);
		width: fit-content;
		max-width: 100%;
	}

	.range-pill {
		appearance: none;
		background: transparent;
		border: 0;
		padding: 0.45rem 0.9rem;
		border-radius: 0.4rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.75);
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
		white-space: nowrap;
	}

	.range-pill:hover {
		background: hsl(var(--hsl-base-300));
		color: hsl(var(--hsl-content));
	}

	.range-pill.is-active {
		background: hsl(var(--hsl-primary));
		color: hsl(var(--hsl-primary-content));
		font-weight: 600;
	}

	.project-filter {
		position: relative;
		max-width: 22rem;
	}

	.project-trigger {
		appearance: none;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.55rem 0.85rem;
		border-radius: 0.5rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
		color: hsl(var(--hsl-content));
		font-size: 0.9375rem;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.12s ease, background 0.12s ease;
	}

	.project-trigger:hover {
		border-color: hsl(var(--hsl-primary) / 0.45);
	}

	.project-trigger i {
		transition: transform 0.15s ease;
		color: hsl(var(--hsl-content) / 0.6);
		font-size: 0.75rem;
	}

	.project-trigger i.is-open {
		transform: rotate(180deg);
	}

	.project-popover {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		z-index: 20;
		width: min(22rem, calc(100vw - 2rem));
		background: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: 0.625rem;
		box-shadow:
			0 4px 12px hsl(220 20% 10% / 0.12),
			0 12px 32px hsl(220 20% 10% / 0.18);
		overflow: hidden;
		display: grid;
	}

	.project-popover-head {
		padding: 0.75rem;
		display: grid;
		gap: 0.5rem;
		border-bottom: 1px solid hsl(var(--hsl-line) / 0.6);
	}

	.project-popover-bulk {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.8125rem;
	}

	.project-popover-list {
		max-height: 18rem;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.project-popover-empty {
		padding: 1.25rem;
		text-align: center;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.project-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0.4rem;
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.project-row:hover {
		background: hsl(var(--hsl-primary) / 0.06);
	}

	.project-row input {
		margin: 0;
		accent-color: hsl(var(--hsl-primary));
		flex-shrink: 0;
	}

	.project-row-sid {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.6);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.summary-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.summary-card {
		padding: 1.25rem 1.5rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		box-shadow:
			0 1px 2px hsl(220 20% 20% / 0.04),
			0 2px 6px hsl(220 20% 20% / 0.04);
		display: grid;
		gap: 0.5rem;
	}

	.summary-card.is-primary {
		background: linear-gradient(
			135deg,
			hsl(var(--hsl-primary) / 0.12) 0%,
			hsl(var(--hsl-accent) / 0.12) 100%
		);
		border-color: hsl(var(--hsl-primary) / 0.18);
	}

	.summary-label {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.summary-value {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.summary-amount {
		font-size: 1.85rem;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.summary-card.is-primary .summary-amount {
		color: hsl(var(--hsl-primary));
	}

	.summary-currency {
		font-size: 0.9375rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.chart-container {
		min-height: 18rem;
	}

	.chart-container.is-hidden {
		display: none;
	}

	.chart-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 18rem;
		font-size: 2rem;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.tabular {
		font-variant-numeric: tabular-nums;
	}

	.row-subtext {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.6);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
</style>
