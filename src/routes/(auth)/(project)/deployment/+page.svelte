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

<div class="page-head">
	<div>
		<h4><strong>Deployments</strong></h4>
		<p class="page-sub">{deployments.length} {deployments.length === 1 ? 'deployment' : 'deployments'}</p>
	</div>
	<a class="button is-icon-left" href="/deployment/deploy?project={project}">
		<i class="fa-solid fa-plus"></i>
		Deploy
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table">
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
							{#if it.ttl === -1}
								<i class="fa-regular fa-clock mr-3 text-negative" title="Expired — pending deletion"></i>
							{:else if it.ttl > 0}
								<i class="fa-regular fa-clock mr-3 text-warning"
									title={`Auto-delete at ${format.ttlExpireAt(it.ttl)} (in ${format.duration(it.ttl)})`}></i>
							{/if}
							<a class="link" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
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
				{#if !error}
					<NoDataRow span={6} list={deployments}
						icon="fa-rocket"
						message="No deployments yet"
						hint="Deploy a container image to get started."
						ctaLabel="Deploy"
						ctaHref={`/deployment/deploy?project=${project}`} />
				{/if}
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>
