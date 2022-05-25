<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { page } from '$app/stores'
	import { invalidate } from '$app/navigation'
	import api from '$lib/api'
	import modal from '$lib/modal'

	export let deployment

	$: project = $page.stuff.project

	$: canPause = deployment.status === 'success' && deployment.action === 1
	$: canResume = deployment.status === 'success' && deployment.action === 3

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
				await invalidate('deployment')
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
				await invalidate('deployment')
			}
		})
	}
</script>

<div class="lo-12 _gg-12px">
	<div class="_dp-g _gg-12px _gatf-r _gatf-cl-lg">
		<h3 class="_dp-f _fw-w _alit-fst _mgr-24px _mgbt-16px _mgbt-0px-lg">
			<div>
				<DeploymentStatusIcon action={deployment.action} status={deployment.status} url={deployment.statusUrl} />
			</div>
			<div>
				{deployment.name}
				<div class="_fs-400 _cl-dark-secondary _mgt-4px _wb-ba">{deployment.image}</div>
			</div>
		</h3>
		<div class="_dp-f _alit-ct _fw-w">
			<a class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg"
				href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
				Deploy New Revision
			</a>
			{#if canPause}
				<div>
					<button class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg" type="button" on:click={pause}>
						<i class="fas fa-pause"></i>&nbsp;&nbsp;Pause
					</button>
				</div>
			{/if}
			{#if canResume}
				<div>
					<button class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg" type="button" on:click={resume}>
						<i class="fas fa-play"></i>&nbsp;&nbsp;Resume
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<hr>

<div class="nav-tabs-wrap _fdrt-cl _fdrt-r-md">
	<ul class="nav nav-tabs _mgbt-20px _mgbt-0px-lg _w-100pct">
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" class:active={$page.url.pathname === '/deployment/metrics'} href={`/deployment/metrics?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Metric</a>
		</li>
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" class:active={$page.url.pathname === '/deployment/detail'} href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Details</a>
		</li>
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" class:active={$page.url.pathname === '/deployment/revision'} href={`/deployment/revision?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Revision</a>
		</li>
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" class:active={$page.url.pathname === '/deployment/logs'} href={`/deployment/logs?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Logs</a>
		</li>
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" class:active={$page.url.pathname === '/deployment/events'} href={`/deployment/events?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Events</a>
		</li>
	</ul>
</div>
