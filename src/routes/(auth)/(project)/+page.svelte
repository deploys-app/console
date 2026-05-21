<script>
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'
	import OutcomeBadge from '$lib/components/OutcomeBadge.svelte'

	const { data } = $props()


	const unitGiB = 1024 * 1024 * 1024


	onMount(() => {
		const interval = setInterval(() => {
			api.invalidate('project.usage')
		}, 600000)
		return () => {
			clearInterval(interval)
		}
	})

	function formatNumber (v) {
		if (v == null || Number.isNaN(v)) return '?'
		return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
	}
	function formatCompact (v) {
		if (v == null || Number.isNaN(v)) return '?'
		return v.toLocaleString(undefined, {
			notation: 'compact',
			maximumFractionDigits: 2
		})
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
			value: formatCompact(usage.cpuUsage),
			full: formatNumber(usage.cpuUsage),
			unit: 'vCPU-s'
		},
		{
			key: 'cpu',
			icon: 'fa-gauge-high',
			label: 'CPU Allocated',
			value: formatCompact(usage.cpu),
			full: formatNumber(usage.cpu),
			unit: 'vCPU-s'
		},
		{
			key: 'memory',
			icon: 'fa-memory',
			label: 'Memory',
			value: formatCompact(usage.memory / unitGiB),
			full: formatNumber(usage.memory / unitGiB),
			unit: 'GiB-s'
		},
		{
			key: 'disk',
			icon: 'fa-hard-drive',
			label: 'Disk',
			value: formatCompact(usage.disk / unitGiB),
			full: formatNumber(usage.disk / unitGiB),
			unit: 'GiB-s'
		},
		{
			key: 'egress',
			icon: 'fa-cloud-arrow-up',
			label: 'Egress',
			value: formatCompact(usage.egress / unitGiB),
			full: formatNumber(usage.egress / unitGiB),
			unit: 'GiB'
		},
		{
			key: 'registryEgress',
			icon: 'fa-box-archive',
			label: 'Registry Egress',
			value: formatCompact(usage.registryEgress / unitGiB),
			full: formatNumber(usage.registryEgress / unitGiB),
			unit: 'GiB'
		},
		{
			key: 'replica',
			icon: 'fa-clone',
			label: 'Replica',
			value: formatCompact(usage.replica),
			full: formatNumber(usage.replica),
			unit: 'replica-s'
		},
		{
			key: 'domainCdn',
			icon: 'fa-globe',
			label: 'Domain CDN',
			value: formatCompact(usage.domainCdn),
			full: formatNumber(usage.domainCdn),
			unit: 'domain-s'
		}
	])
</script>

<h6>Dashboard</h6>
<br>
<div class="lo-12 lo-6:md _g-7 _alit-st">
	<div class="nm-panel is-level-300 lo-12 _g-7">
		<h6>
			<i class="fa-solid fa-project-diagram"></i>
			<strong class="_mgl-6">Project Info</strong>
		</h6>
		<hr>
		<div class="nm-field">
			<label for="input-project_name">Project Name</label>
			<div class="nm-input">
				<input id="input-project_name" readonly value={projectInfo.name}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-project_id">Project ID</label>
			<div class="nm-input">
				<input id="input-project_id" readonly value={projectInfo.project}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-project_number">Project Number</label>
			<div class="nm-input">
				<input id="input-project_number" readonly value={projectInfo.id}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-project_billing">Billing Account ID</label>
			<div class="nm-input">
				<input id="input-project_billing" readonly value={projectInfo.billingAccount}>
			</div>
		</div>

<!--		<hr>-->

<!--		<a class="nm-link _dp-f _alit-ct" href="">-->
<!--			<i class="fa-solid fa-arrow-right _fs-20"></i>-->
<!--			<span class="_mgl-6">Project Settings</span>-->
<!--		</a>-->
	</div>

	<div class="nm-panel is-level-300 lo-12 _g-7">
		<div class="_dp-f _alit-ct _jtfct-spbtw">
			<h6>
				<i class="fa-solid fa-credit-card"></i>
				<strong class="_mgl-6">Billing</strong>
			</h6>
			<a class="nm-link" href="/billing">
				View billing
				<i class="fa-solid fa-arrow-right _mgl-3"></i>
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
				<div class="billing-card" title={`${item.full} ${item.unit}`}>
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

	<div class="nm-panel is-level-300 lo-12 _g-7">
		<div class="_dp-f _alit-ct _jtfct-spbtw">
			<h6>
				<i class="fa-solid fa-clock-rotate-left"></i>
				<strong class="_mgl-6">Recent Activity</strong>
			</h6>
			<a class="nm-link" href="/audit-log?project={projectInfo.project}">
				View all
				<i class="fa-solid fa-arrow-right _mgl-3"></i>
			</a>
		</div>
		<hr>
		{#if auditLog.error?.forbidden}
			<div class="_tal-ct _pd-6 _cl-content-600">
				<i class="fa-solid fa-lock _mgr-4"></i>
				You don't have permission to view audit logs
			</div>
		{:else if auditLog.error}
			<div class="_tal-ct _pd-6 _cl-content-600">
				{auditLog.error.message || auditLog.error}
			</div>
		{:else if !auditLog.items.length}
			<div class="_tal-ct _pd-6 _cl-content-600">
				No recent activity
			</div>
		{:else}
			<ul class="activity-feed">
				{#each auditLog.items as it (it.id)}
					<li>
						<OutcomeBadge outcome={it.outcome} />
						<div class="activity-body">
							<div class="activity-line">
								<span class="actor">{it.actor.email}</span>
								<span class="action">{it.action}</span>
								{#if it.resource.type}
									<span class="resource">
										<strong>{it.resource.type}</strong>{#if it.resource.name}<span class="resource-name">/{it.resource.name}</span>{/if}
									</span>
								{/if}
							</div>
							<time class="activity-time">{format.datetime(it.createdAt)}</time>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style lang="scss">
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
			hsl(var(--hsl-primary)/0.12) 0%,
			hsl(var(--hsl-accent)/0.12) 100%
		);
		border: 1px solid hsl(var(--hsl-primary)/0.18);
		margin-bottom: 1rem;
	}

	.billing-total-label {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content)/0.7);
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
		color: hsl(var(--hsl-content)/0.7);
	}

	.billing-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.625rem;

		@media (min-width: 640px) {
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
		border: 1px solid hsl(var(--hsl-line)/0.6);
		transition:
			background var(--timing-fastest) ease,
			border-color var(--timing-fastest) ease,
			transform var(--timing-fastest) ease;

		&:hover {
			border-color: hsl(var(--hsl-primary)/0.45);
			background: hsl(var(--hsl-base-200));
			transform: translateY(-1px);
		}
	}

	.billing-card-head {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		color: hsl(var(--hsl-primary));
		font-size: 0.8125rem;
		min-height: 2.5rem;

		i {
			font-size: 0.875rem;
			width: 1rem;
			text-align: center;
			line-height: 1.25rem;
		}
	}

	.billing-card-label {
		font-weight: 600;
		color: hsl(var(--hsl-content)/0.85);
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
		color: hsl(var(--hsl-content)/0.55);
	}

	.activity-feed {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			align-items: flex-start;
			gap: 0.625rem;
			padding: 0.5rem 0;

			& + li {
				border-top: 1px solid hsl(var(--hsl-content)/0.08);
			}
		}
	}

	.activity-body {
		flex: 1;
		min-width: 0;
	}

	.activity-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.875rem;
		line-height: 1.3;
	}

	.actor {
		color: hsl(var(--hsl-content));
		font-weight: 500;
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action {
		font-family: var(--font-family-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content)/0.85);
	}

	.resource {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content)/0.9);
	}

	.resource-name {
		color: hsl(var(--hsl-content)/0.6);
		margin-left: 0.1rem;
	}

	.activity-time {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content)/0.55);
	}
</style>
