<script>
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'

	let deployments = null

	project.subscribe(async () => {
		deployments = await api.deployment.list({ project: $project })
	})
</script>

<h6>Deployments</h6>

<br>

<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/deployment/deploy?project=${$project}`}>
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
			{#if deployments == null}
				<td colspan="6" class="_tal-ct">
					Loading...
				</td>
			{:else}
				{#each deployments as it}
					<tr>
						<td>
							<StatusIcon action={it.action} status={it.status} url={it.statusUrl} />
							{#if it.action === 'pause'}
								<i class="fas fa-pause _cl-warning-500 _mgh-12px"></i>
							{:else if it.status === 'success'}
	<!--							<span x-data="{ status: null }" x-init="() => {-->
	<!--								fetch('{{.StatusURL}}')-->
	<!--									.then((resp) => resp.json())-->
	<!--									.then((data) => {-->
	<!--										status = data-->
	<!--									})-->
	<!--							}">-->
	<!--								<i x-show="status === null" class="fas fa-spin fa-spinner _cl-light _mgh-12px"></i>-->
	<!--								<template x-if="status !== null">-->
	<!--									<span>-->
	<!--										<i x-show="status.ready === status.count" class="fas fa-check-circle _cl-positive-500 _mgh-12px"></i>-->
	<!--										<i x-show="status.ready !== status.count" class="fas fa-exclamation-triangle _cl-warning-500 _mgh-12px"></i>-->
	<!--									</span>-->
	<!--								</template>-->
	<!--							</span>-->
							{:else}

							{/if}
							<!--{{if eq .Action.String "pause"}}-->
							<!--{{else}}-->
							<!--{{if eq .Status.String "success"}}-->
							<!--{{else}}-->
							<!--{{template "status-icon" .Status}}-->
							<!--{{end}}-->
							<!--{{end}}-->
							<a class="moon-link" href={`/deployment/metrics?project=${$project}&location=${it.location}&name=${it.name}`}>
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
					<td colspan="6" class="_tal-ct">
						No data
					</td>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
