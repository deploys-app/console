<script>
	import { onMount } from 'svelte'
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project

	/** @type {MaybePromise<Api.Response<Api.List<Api.Deployment>>>} */
	$: deployments = data.deployments

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('deployment.list')
		const res = await data.deployments
		if (!res.ok) {
			return 3000
		}
		deployments = res
		if (res.result.items?.some((x) => x.status === 'pending')) {
			return 4000
		}
	}, 300000))
</script>

<h6>Deployments</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/deployment/deploy?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
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
				{#await deployments}
					<LoadingRow span={6} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it (`${it.name}-${it.location}`)}
							<tr>
								<td>
									<DeploymentStatusIcon action={it.action} status={it.status} url={it.statusUrl} type={it.type} />
									<a class="nm-link" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
										{it.name}
									</a>
								</td>
								<td>{format.deploymentType(it.type)}</td>
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
							<NoDataRow span={6} />
						{/each}
					{:else}
						<ErrorRow span={6} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={6} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
