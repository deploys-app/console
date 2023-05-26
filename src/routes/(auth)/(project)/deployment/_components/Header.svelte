<script>
	import { createEventDispatcher } from 'svelte'
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import * as modal from '$lib/modal'

	export let deployment

	$: project = $page.data.project

	$: canPause = deployment.status === 'success' && deployment.action === 'deploy'
	$: canResume = deployment.status === 'success' && deployment.action === 'pause'

	const dispatch = createEventDispatcher()

	function pause () {
		modal.confirm({
			title: `Pause ${deployment.name} in ${deployment.location} ?`,
			yes: 'Pause',
			callback: async () => {
				const resp = await api.invoke('deployment.pause', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				dispatch('invalidate')
			}
		})
	}

	function resume () {
		modal.confirm({
			title: `Resume ${deployment.name} in ${deployment.location} ?`,
			yes: 'Resume',
			callback: async () => {
				const resp = await api.invoke('deployment.resume', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				dispatch('invalidate')
			}
		})
	}
</script>

<div class="lo-12 _g-5">
	<div class="_dp-g _g-5 _gatf-r _gatf-cl:lg">
		<h3 class="_dp-f _fw-w _alit-fst _mgr-7 _mgbt-6 _mgbt-0:lg">
			<div>
				<DeploymentStatusIcon action={deployment.action} status={deployment.status} url={deployment.statusUrl} />
			</div>
			<div>
				{deployment.name}
				<div class="image _fs-4 _mgt-3 _wb-ba">{deployment.image}</div>
			</div>
		</h3>
		<div class="_dp-f _alit-ct _fw-w">
			<a class="nm-button _mgl-at:lg _mgr-7 _mgbt-6 _mgbt-0:lg"
				href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
				Deploy New Revision
			</a>
			{#if canPause}
				<div>
					<button class="nm-button _mgl-at:lg _mgr-7 _mgbt-6 _mgbt-0:lg" type="button" on:click={pause}>
						<i class="fa-solid fa-pause"></i>&nbsp;&nbsp;Pause
					</button>
				</div>
			{/if}
			{#if canResume}
				<div>
					<button class="nm-button _mgl-at:lg _mgr-7 _mgbt-6 _mgbt-0:lg" type="button" on:click={resume}>
						<i class="fa-solid fa-play"></i>&nbsp;&nbsp;Resume
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<hr>

<div class="nm-tabs is-variant-underline _mgbt-0:lg _w-100pct _fdrt-cl _fdrt-r:md">
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/deployment/metrics'}
		href={`/deployment/metrics?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
		Metric
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/deployment/detail'}
		href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
		Details
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/deployment/revision'}
		href={`/deployment/revision?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
		Revision
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/deployment/logs'}
		href={`/deployment/logs?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
		Logs
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/deployment/events'}
		href={`/deployment/events?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
		Events
	</a>
</div>

<style>
	.image {
		color: hsla(220, 10%, 47%, 0.95);
	}
</style>