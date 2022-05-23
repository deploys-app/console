<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const deployments = await api.invoke('deployment.list', { project }, fetch)
		if (!deployments.ok && !deployments.error.forbidden) {
			return {
				status: 500,
				error: `deployments: ${deployments.error.message}`
			}
		}
		return {
			props: {
				permission: {
					deployments: !deployments.error?.forbidden
				},
				deployments: deployments.result?.deployments || []
			},
			dependencies: ['deployments']
		}
	}
</script>

<script>
	import { onDestroy } from 'svelte'
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { browser } from '$app/env'
	import { page } from '$app/stores'
	import { invalidate } from '$app/navigation'
	import format from '$lib/format'
	import { loading } from '$lib/stores'

	export let permission
	export let deployments

	let pendingTimeout

	$: project = $page.stuff.project
	$: {
		if (browser) {
			let hasPending = deployments.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => invalidate('deployments'), 2000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}
</script>

<h6>Deployments</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/deployment/deploy?project=${project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Name</th>
				<th>Type</th>
<!--				<th>CPU</th>-->
				<th>Memory</th>
				<th>Replicas</th>
				<th>Location</th>
				<th>Last deployed</th>
<!--				<th>Deployed by</th>-->
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="6" />
			{:else}
				{#each deployments as it}
					<tr>
						<td>
							<DeploymentStatusIcon action={it.action} status={it.status} url={it.statusUrl} />
							<a sveltekit:prefetch class="moon-link" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.type}</td>
	<!--					<td>{format.cpu(it.resources.requests.cpu)}</td>-->
						<td>{format.memory(it.resources.requests.memory)}</td>
						<td>
							{#if it.minReplicas > 0}
								{#if it.minReplicas === it.maxReplicas}
									{it.minReplicas}
								{:else}
									{it.minReplicas} - {it.maxReplicas}
								{/if}
							{:else}
								-
							{/if}
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
	<!--					<td>{it.createdBy}</td>-->
					</tr>
				{:else}
					<NoDataRow span="6" forbidden={!permission.deployments} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
