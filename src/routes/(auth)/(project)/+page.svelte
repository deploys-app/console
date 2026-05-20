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
			<div class="nm-table-container">
				<table class="nm-table is-variant-compact">
					<thead>
						<tr>
							<th>Time</th>
							<th>Outcome</th>
							<th>Actor</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#each auditLog.items as it (it.id)}
							<tr>
								<td>{format.datetime(it.createdAt)}</td>
								<td><OutcomeBadge outcome={it.outcome} /></td>
								<td class="ellipsis">{it.actor.email}</td>
								<td>
									<span class="action-cell">{it.action}</span>
									{#if it.resource.type}
										<div class="resource-line">
											<strong>{it.resource.type}</strong>
											{#if it.resource.name}
												<span class="resource-name">/ {it.resource.name}</span>
											{/if}
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.action-cell {
		font-family: var(--font-family-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content)/0.85);
	}

	.resource-line {
		font-size: 0.8125rem;
		margin-top: 0.15rem;
	}

	.resource-name {
		color: hsl(var(--hsl-content)/0.65);
	}

	.ellipsis {
		max-width: 14rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
