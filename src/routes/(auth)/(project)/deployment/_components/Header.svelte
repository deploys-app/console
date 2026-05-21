<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import * as modal from '$lib/modal'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Deployment} deployment
	 * @property {() => void} invalidate
	 */

	/** @type {Props} */
	const { deployment, invalidate } = $props()

	const project = $derived($page.data.project)

	const canPause = $derived(deployment.status === 'success' && deployment.action === 'deploy')
	const canResume = $derived(deployment.status === 'success' && deployment.action === 'pause')

	function pause () {
		modal.confirm({
			title: `Pause ${deployment.name} in ${deployment.location}?`,
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
				invalidate?.()
			}
		})
	}

	function resume () {
		modal.confirm({
			title: `Resume ${deployment.name} in ${deployment.location}?`,
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
				invalidate?.()
			}
		})
	}
</script>

<div class="grid grid-cols-1 gap-3">
	<div class="grid gap-3 grid-flow-row xl:grid-flow-col">
		<h3 class="flex flex-wrap items-start mr-6 mb-4 xl:mb-0">
			<div>
				<DeploymentStatusIcon action={deployment.action} status={deployment.status} url={deployment.statusUrl} type={deployment.type} />
			</div>
			<div>
				{deployment.name}
				<div class="image text-base mt-1 break-all">{deployment.image}</div>
			</div>
		</h3>
		<div class="flex items-center flex-wrap">
			<a class="button xl:ml-auto mr-6 mb-4 xl:mb-0"
				href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
				Deploy New Revision
			</a>
			{#if canPause}
				<div>
					<button class="button xl:ml-auto mr-6 mb-4 xl:mb-0" type="button" onclick={pause}>
						<i class="fa-solid fa-pause"></i>&nbsp;&nbsp;Pause
					</button>
				</div>
			{/if}
			{#if canResume}
				<div>
					<button class="button xl:ml-auto mr-6 mb-4 xl:mb-0" type="button" onclick={resume}>
						<i class="fa-solid fa-play"></i>&nbsp;&nbsp;Resume
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<hr>

<div class="tabs is-variant-underline xl:mb-0 w-full flex-col lg:flex-row">
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
