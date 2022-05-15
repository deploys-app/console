<script>
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'

	let list = null

	project.subscribe(async () => {
		list = await api.workloadIdentity.list({ project: $project })
	})
</script>

<h6>Workload Identities</h6>

<br>

<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/workload-identity/create?project=${$project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Name</th>
				<th>Location</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<tr>
					<td class="_tal-ct" colspan="3">Loading...</td>
				</tr>
			{:else}
				{#each list as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/workload-identity/detail?project=${$project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{:else}
					<tr>
						<td class="_tal-ct" colspan="3">No data</td>
					</tr>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
