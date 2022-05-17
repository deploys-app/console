<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const [usage, price] = await Promise.all([
			api.invoke('project.usage', { project: project }, fetch),
			api.invoke('billing.project', { project: project }, fetch)
		])

		if (!usage.ok || !price.ok) {
			return {
				status: 500,
				error: `usage: ${usage.error.message}, price: ${price.error.message}}`
			}
		}

		return {
			stuff: {
				menu: 'dashboard'
			},
			props: {
				usage: usage.result,
				price: price.result
			}
		}
	}
</script>

<script>
	import { projectInfo } from '$lib/stores'

	export let usage
	export let price

	const unitGiB = 1024 * 1024 * 1024

	$: billing = {
		price: (+price.price).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		cpu: (+usage.cpuUsage).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		memory: (+usage.memory / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		egress: (+usage.egress / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		disk: (+usage.disk / unitGiB).toLocaleString(undefined, { maximumFractionDigits: 2 }),
		replica: (+usage.replica).toLocaleString(undefined, { maximumFractionDigits: 2 })
	}
</script>

<h6>Dashboard</h6>
<br>
<div class="lo-12 lo-6-md _gg-24px _alit-st">
	<div class="moon-panel lo-12 _gg-24px">
		<h6>
			<i class="far fa-project-diagram"></i>
			<strong class="_mgl-16px">Project Info</strong>
		</h6>
		<hr>
		<div class="moon-field">
			<label for="input-project_name">Project Name</label>
			<div class="moon-input">
				<input id="input-project_name" type="text" readonly value={$projectInfo?.name}>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-project_id">Project ID</label>
			<div class="moon-input">
				<input id="input-project_id" type="text" readonly value={$projectInfo?.project}>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-project_number">Project Number</label>
			<div class="moon-input">
				<input id="input-project_number" type="text" readonly value={$projectInfo?.id}>
			</div>
		</div>

<!--		<hr>-->

<!--		<a class="_dp-f _alit-ct moon-link" href="">-->
<!--			<i class="far fa-arrow-right _fs-20"></i>-->
<!--			<span class="_mgl-16px">Project Settings</span>-->
<!--		</a>-->
	</div>

	<div class="moon-panel lo-12 _gg-24px">
		<h6>
			<i class="fas fa-credit-card"></i>
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
					<span>&nbsp;GiB/s</span>
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
					<span>&nbsp;GiB/s</span>
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
</div>
