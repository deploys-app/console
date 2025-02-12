<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const deployments = $derived(data.deployments)
	const error = $derived(data.error)
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
				{#each deployments as it (`${it.name}-${it.location}`)}
					<tr>
						<td>
							<DeploymentStatusIcon action={it.action} status={it.status} url={it.statusUrl} type={it.type} />
							<a class="nm-link" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{format.deploymentType(it.type)}</td>
<!--						<td>{format.cpu(it.resources.requests.cpu)}</td>-->
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
<!--						<td>{it.createdBy}</td>-->
					</tr>
				{/each}
				<NoDataRow span={6} list={deployments} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>
