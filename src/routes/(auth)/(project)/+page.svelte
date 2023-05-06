<script>
	import { onMount } from 'svelte'
	import api from '$lib/api'

	export let data

	$: projectInfo = data.projectInfo
	$: usage = data.usage
	$: price = data.price
	$: permission = data.permission

	const unitGiB = 1024 * 1024 * 1024

	$: billing = {
		price: price.price.toLocaleString(undefined, { maximumFractionDigits: 2 }),
		cpu: usage.cpuUsage.toLocaleString(undefined, { maximumFractionDigits: 2 }),
		memory: (usage.memory / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		egress: (usage.egress / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		disk: (usage.disk / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		replica: usage.replica.toLocaleString(undefined, { maximumFractionDigits: 2 })
	}

	onMount(() => {
		const interval = setInterval(() => {
			api.invalidate('project.usage')
		}, 600000)
		return () => {
			clearInterval(interval)
		}
	})
</script>

<h6>Dashboard</h6>
<br>
<div class="lo-12 lo-6-md _gg-24px _alit-st">
	<div class="panel lo-12 _gg-24px">
		<h6>
			<i class="fa-solid fa-project-diagram"></i>
			<strong class="_mgl-16px">Project Info</strong>
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

<!--		<a class="_dp-f _alit-ct link" href="">-->
<!--			<i class="fa-solid fa-arrow-right _fs-20"></i>-->
<!--			<span class="_mgl-16px">Project Settings</span>-->
<!--		</a>-->
	</div>

	{#if permission.billing}
		<div class="panel lo-12 _gg-24px">
			<h6>
				<i class="fa-solid fa-credit-card"></i>
				<strong class="_mgl-16px">Billing</strong>
			</h6>
			<hr>
			<div class="lo-12 lo-6-sm _gg-12px">
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">CPU</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.cpu}</span>
						<span>&nbsp;seconds</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">Memory</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.memory}</span>
						<span>&nbsp;GiB-s</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">Egress</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.egress}</span>
						<span>&nbsp;GiB</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">Disk</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.disk}</span>
						<span>&nbsp;GiB-s</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">Replica</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.replica}</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-4px _pd-16px">
					<h4 class="_cl-primary-500">Price</h4>
					<div class="_mgt-8px">
						<span class="_fs-600">{billing?.price}</span>
						<span>&nbsp;THB</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
