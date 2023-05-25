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
		price: formatNumber(price.price),
		cpu: formatNumber(usage.cpuUsage),
		memory: formatNumber(usage.memory / unitGiB),
		egress: formatNumber(usage.egress / unitGiB),
		disk: formatNumber(usage.disk / unitGiB),
		replica: formatNumber(usage.replica)
	}

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
</script>

<h6>Dashboard</h6>
<br>
<div class="lo-12 lo-6:md _g-7 _alit-st">
	<div class="panel lo-12 _g-7">
		<h6>
			<i class="fa-solid fa-project-diagram"></i>
			<strong class="_mgl-6">Project Info</strong>
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
<!--			<span class="_mgl-6">Project Settings</span>-->
<!--		</a>-->
	</div>

	{#if permission.billing}
		<div class="panel lo-12 _g-7">
			<h6>
				<i class="fa-solid fa-credit-card"></i>
				<strong class="_mgl-6">Billing</strong>
			</h6>
			<hr>
			<div class="lo-12 lo-6:sm _g-5">
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">CPU</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.cpu}</span>
						<span>&nbsp;seconds</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">Memory</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.memory}</span>
						<span>&nbsp;GiB-s</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">Egress</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.egress}</span>
						<span>&nbsp;GiB</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">Disk</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.disk}</span>
						<span>&nbsp;GiB-s</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">Replica</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.replica}</span>
					</div>
				</div>
				<div class="_bgcl-neutral-700 _bdrd-3 _pd-6">
					<h4 class="_cl-primary-500">Price</h4>
					<div class="_mgt-4">
						<span class="_fs-6">{billing?.price}</span>
						<span>&nbsp;THB</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
