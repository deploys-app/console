<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const workloadIdentities = $derived(data.workloadIdentities)
	const error = $derived(data.error)
</script>

<h6>Workload Identities</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			<a class="nm-button" href="/workload-identity/create?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container mt-4">
		<table class="nm-table">
			<thead>
			<tr>
				<th>Name</th>
				<th>Location</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
				{#each workloadIdentities as it (`${it.location}-${it.name}`)}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="nm-link" href="/workload-identity/detail?project={project}&location={it.location}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={workloadIdentities} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
