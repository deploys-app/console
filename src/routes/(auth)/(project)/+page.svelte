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
		if (Number.isNaN(v)) return '?'
		return v?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '?'
	}
	const projectInfo = $derived(data.projectInfo)
	const usage = $derived(data.usage)
	const price = $derived(data.price)
	const auditLog = $derived(data.auditLog)
	const billing = $derived({
		price: formatNumber(price.price),
		cpu: formatNumber(usage.cpuUsage),
		memory: formatNumber(usage.memory / unitGiB),
		egress: formatNumber(usage.egress / unitGiB),
		disk: formatNumber(usage.disk / unitGiB),
		replica: formatNumber(usage.replica)
	})
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
		<h6>
			<i class="fa-solid fa-credit-card"></i>
			<strong class="_mgl-6">Billing</strong>
		</h6>
		<hr>
		<div class="lo-12 lo-6:sm _g-5">
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">CPU</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.cpu}</span>
					<span>&nbsp;seconds</span>
				</div>
			</div>
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">Memory</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.memory}</span>
					<span>&nbsp;GiB-s</span>
				</div>
			</div>
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">Egress</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.egress}</span>
					<span>&nbsp;GiB</span>
				</div>
			</div>
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">Disk</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.disk}</span>
					<span>&nbsp;GiB-s</span>
				</div>
			</div>
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">Replica</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.replica}</span>
				</div>
			</div>
			<div class="_bgcl-base-200 _bdrd-3 _pd-6">
				<h4 class="_cl-primary">Price</h4>
				<div class="_mgt-4">
					<span class="_fs-6">{billing?.price}</span>
					<span>&nbsp;THB</span>
				</div>
			</div>
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
