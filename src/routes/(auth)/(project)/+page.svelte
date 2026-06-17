<script lang="ts">
	import type { PageData } from './$types'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'

	const { data }: { data: PageData } = $props()


	const unitGiB = 1024 * 1024 * 1024


	onMount(() => {
		const interval = setInterval(() => {
			api.invalidate('project.usage')
		}, 600000)
		return () => {
			clearInterval(interval)
		}
	})

	function formatNumber (v: number): string {
		if (v == null || Number.isNaN(v)) return '?'
		return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
	}
	function formatCompact (v: number): string {
		if (v == null || Number.isNaN(v)) return '?'
		return v.toLocaleString(undefined, {
			notation: 'compact',
			maximumFractionDigits: 2
		})
	}
	function formatStorage (bytes: number, unitSuffix: string) {
		const gib = bytes / unitGiB
		if (gib >= 1024) {
			const tib = gib / 1024
			const unit = unitSuffix ? `TiB-${unitSuffix}` : 'TiB'
			const full = formatNumber(tib)
			return { value: formatCompact(tib), full, unit, tooltip: `${full} ${unit}` }
		}
		const unit = unitSuffix ? `GiB-${unitSuffix}` : 'GiB'
		const full = formatNumber(gib)
		return { value: formatCompact(gib), full, unit, tooltip: `${full} ${unit}` }
	}
	function billingElapsedSeconds (): number {
		const now = new Date()
		const start = new Date(now.getFullYear(), now.getMonth(), 1)
		return Math.max((now.getTime() - start.getTime()) / 1000, 1)
	}
	function formatAvgCount (seconds: number, unit: string, rawUnit: string) {
		const avg = seconds / billingElapsedSeconds()
		return { value: formatCompact(avg), full: formatNumber(avg), unit, tooltip: `${formatNumber(seconds)} ${rawUnit}` }
	}
	function rawStorageTooltip (bytes: number): string {
		const r = formatStorage(bytes, 's')
		return `${r.full} ${r.unit}`
	}
	// static_storage is a daily byte gauge summed over the month (byte-days), so
	// its average level divides by elapsed days — not seconds like the
	// continuously-integrated memory/disk metrics. Floor at 1 day so the first of
	// the month (one snapshot) reads as that snapshot, not an inflated number.
	function billingElapsedDays (): number {
		return Math.max(billingElapsedSeconds() / 86400, 1)
	}
	function rawStorageDayTooltip (bytes: number): string {
		const r = formatStorage(bytes, 'd')
		return `${r.full} ${r.unit}`
	}
	const projectInfo = $derived(data.projectInfo)
	const usage = $derived(data.usage)
	const price = $derived(data.price)
	const auditLog = $derived(data.auditLog)
	const billing = $derived([
		{
			key: 'cpuUsage',
			icon: 'fa-microchip',
			label: 'CPU Usage',
			...formatAvgCount(usage.cpuUsage, 'vCPUs', 'vCPU-s')
		},
		{
			key: 'memory',
			icon: 'fa-memory',
			label: 'Memory',
			...formatStorage(usage.memory / billingElapsedSeconds(), ''),
			tooltip: rawStorageTooltip(usage.memory)
		},
		{
			key: 'disk',
			icon: 'fa-hard-drive',
			label: 'Disk',
			...formatStorage(usage.disk / billingElapsedSeconds(), ''),
			tooltip: rawStorageTooltip(usage.disk)
		},
		{
			key: 'staticStorage',
			icon: 'fa-folder-tree',
			label: 'Static Storage',
			...formatStorage(usage.staticStorage / billingElapsedDays(), ''),
			tooltip: rawStorageDayTooltip(usage.staticStorage)
		},
		{
			key: 'egress',
			icon: 'fa-cloud-arrow-up',
			label: 'Egress',
			...formatStorage(usage.egress, '')
		},
		{
			key: 'registryEgress',
			icon: 'fa-box-archive',
			label: 'Registry Egress',
			...formatStorage(usage.registryEgress, '')
		},
		{
			key: 'dropboxEgress',
			icon: 'fa-box-open',
			label: 'Dropbox Egress',
			...formatStorage(usage.dropboxEgress, '')
		},
		{
			key: 'replica',
			icon: 'fa-clone',
			label: 'Replica',
			...formatAvgCount(usage.replica, 'replicas', 'replica-s')
		}
	])
</script>

<div class="page-head">
	<div>
		<h4><strong>Dashboard</strong></h4>
		<p class="page-sub">{projectInfo.name}</p>
	</div>
</div>
<div class="grid grid-cols-1 lg:grid lg:grid-cols-2 gap-6 items-stretch">
	<div class="panel is-level-300 gap-6 dashboard-panel">
		<h6>
			<i class="fa-solid fa-project-diagram"></i>
			<strong class="ml-4">Project Info</strong>
		</h6>
		<hr>
		<div class="field">
			<label for="input-project_name">Project Name</label>
			<div class="input">
				<input id="input-project_name" readonly value={projectInfo.name}>
			</div>
		</div>
		<div class="field">
			<label for="input-project_id">Project ID</label>
			<div class="input">
				<input id="input-project_id" readonly value={projectInfo.project}>
			</div>
		</div>
		<div class="field">
			<label for="input-project_number">Project Number</label>
			<div class="input">
				<input id="input-project_number" readonly value={projectInfo.id}>
			</div>
		</div>
		<div class="field">
			<label for="input-project_billing">Billing Account ID</label>
			<div class="input">
				<input id="input-project_billing" readonly value={projectInfo.billingAccount}>
			</div>
		</div>

<!--		<hr>-->

<!--		<a class="link flex items-center" href="">-->
<!--			<i class="fa-solid fa-arrow-right text-xl"></i>-->
<!--			<span class="ml-4">Project Settings</span>-->
<!--		</a>-->
	</div>

	<div class="panel is-level-300 gap-6 dashboard-panel">
		<div class="flex items-center justify-between">
			<h6>
				<i class="fa-solid fa-credit-card"></i>
				<strong class="ml-4">Billing</strong>
			</h6>
			<a class="link" href="/billing">
				View billing
				<i class="fa-solid fa-arrow-right ml-1"></i>
			</a>
		</div>
		<hr>

		<div class="billing-total">
			<div class="billing-total-label">Estimated Cost (This Month)</div>
			<div class="billing-total-value">
				<span class="billing-total-amount">{formatNumber(price.price)}</span>
				<span class="billing-total-currency">THB</span>
			</div>
		</div>

		<div class="billing-grid">
			{#each billing as item (item.key)}
				<div class="billing-card" title={item.tooltip}>
					<div class="billing-card-head">
						<i class="fa-solid {item.icon}"></i>
						<span class="billing-card-label">{item.label}</span>
					</div>
					<div class="billing-card-value">
						<span class="billing-card-amount">{item.value}</span>
						<span class="billing-card-unit">{item.unit}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="panel is-level-300 gap-6 dashboard-panel">
		<div class="flex items-center justify-between">
			<h6>
				<i class="fa-solid fa-clock-rotate-left"></i>
				<strong class="ml-4">Recent Activity</strong>
			</h6>
			<a class="link" href="/audit-log?project={projectInfo.project}">
				View all
				<i class="fa-solid fa-arrow-right ml-1"></i>
			</a>
		</div>
		<hr>
		{#if auditLog.error?.forbidden}
			<div class="text-center p-4 text-content/70">
				<i class="fa-solid fa-lock mr-2"></i>
				You don't have permission to view audit logs
			</div>
		{:else if auditLog.error}
			<div class="text-center p-4 text-content/70">
				{auditLog.error.message || auditLog.error}
			</div>
		{:else if !auditLog.items.length}
			<div class="text-center p-4 text-content/70">
				No recent activity
			</div>
		{:else}
			<ul class="activity-feed">
				{#each auditLog.items as it (it.id)}
					<li class="activity-item">
						<span class="activity-dot" class:is-fail={it.outcome === 'failure'}
							title={it.outcome}></span>
						<div class="activity-body">
							<div class="activity-line">
								<span class="action">{it.action}</span>
								{#if it.resource.type}
									<span class="resource">
										<strong>{it.resource.type}</strong>{#if it.resource.name}<span class="resource-name">/{it.resource.name}</span>{/if}
									</span>
								{/if}
							</div>
							<div class="activity-foot">
								<span class="actor">{it.actor.email}</span>
								<span class="foot-sep">·</span>
								<time class="activity-time">{format.datetime(it.createdAt)}</time>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.dashboard-panel {
		display: flex;
		flex-direction: column;
		min-height: 28rem;
	}

	.billing-total {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-radius: 0.625rem;
		background: linear-gradient(
			135deg,
			hsl(var(--hsl-primary) / 0.12) 0%,
			hsl(var(--hsl-accent) / 0.12) 100%
		);
		border: 1px solid hsl(var(--hsl-primary) / 0.18);
		margin-bottom: 1rem;
	}

	.billing-total-label {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.billing-total-value {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.billing-total-amount {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		color: hsl(var(--hsl-primary));
		font-variant-numeric: tabular-nums;
	}

	.billing-total-currency {
		font-size: 0.9375rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.billing-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.625rem;
	}

	@media (min-width: 640px) {
		.billing-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.billing-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.75rem 0.875rem;
		border-radius: 0.5rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.6);
		transition:
			background var(--timing-fastest) ease,
			border-color var(--timing-fastest) ease,
			transform var(--timing-fastest) ease;
	}

	.billing-card:hover {
		border-color: hsl(var(--hsl-primary) / 0.45);
		background: hsl(var(--hsl-base-200));
		transform: translateY(-1px);
	}

	.billing-card-head {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		color: hsl(var(--hsl-primary));
		font-size: 0.8125rem;
		min-height: 2.5rem;
	}

	.billing-card-head i {
		font-size: 0.875rem;
		width: 1rem;
		text-align: center;
		line-height: 1.25rem;
	}

	.billing-card-label {
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.85);
		font-size: 0.8125rem;
		line-height: 1.25rem;
	}

	@supports (grid-template-rows: subgrid) {
		.billing-card {
			display: grid;
			grid-template-rows: subgrid;
			grid-row: span 2;
		}

		.billing-card-head {
			min-height: 0;
		}
	}

	.billing-card-value {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.billing-card-amount {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.1;
		color: hsl(var(--hsl-content));
		font-variant-numeric: tabular-nums;
	}

	.billing-card-unit {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.activity-feed {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* Timeline: a continuous rail down the left, a status dot per entry. */
	.activity-item {
		position: relative;
		padding: 0.4rem 0 0.4rem 1.5rem;
	}

	.activity-item::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 0;
		bottom: 0;
		width: 2px;
		background: hsl(var(--hsl-line));
	}

	.activity-item:first-child::before {
		top: 0.85rem;
	}

	.activity-item:last-child::before {
		bottom: auto;
		height: 0.85rem;
	}

	.activity-dot {
		position: absolute;
		left: 0;
		top: 0.7rem;
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: hsl(var(--hsl-positive));
		border: 2px solid hsl(var(--hsl-base-300));
	}

	.activity-dot.is-fail {
		background: hsl(var(--hsl-negative));
	}

	.activity-body {
		min-width: 0;
	}

	.activity-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		line-height: 1.3;
	}

	.action {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--hsl-content));
	}

	.resource {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.8);
	}

	.resource-name {
		color: hsl(var(--hsl-content) / 0.55);
		margin-left: 0.1rem;
	}

	.activity-foot {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		margin-top: 0.15rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.actor {
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.foot-sep {
		opacity: 0.5;
	}
</style>
