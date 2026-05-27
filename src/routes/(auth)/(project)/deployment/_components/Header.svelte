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

<div class="page-head">
	<div class="min-w-0">
		<h4 class="flex flex-wrap items-center gap-y-2 min-w-0">
			<DeploymentStatusIcon action={deployment.action} status={deployment.status} url={deployment.statusUrl} type={deployment.type} />
			<strong class="min-w-0 wrap-anywhere">{deployment.name}</strong>
		</h4>
		<p class="page-sub font-mono min-w-0 wrap-anywhere">{deployment.image}</p>
	</div>
	<div class="flex items-center gap-3 flex-wrap">
		<a class="button"
			href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
			Deploy New Revision
		</a>
		{#if canPause}
			<button class="button is-variant-secondary is-icon-left" type="button" onclick={pause}>
				<i class="fa-solid fa-pause"></i>
				Pause
			</button>
		{/if}
		{#if canResume}
			<button class="button is-variant-secondary is-icon-left" type="button" onclick={resume}>
				<i class="fa-solid fa-play"></i>
				Resume
			</button>
		{/if}
	</div>
</div>
