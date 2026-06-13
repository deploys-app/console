<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const workloadIdentities = $derived(data.workloadIdentities)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Workload Identities</strong></h4>
		<p class="page-sub">{workloadIdentities.length} {workloadIdentities.length === 1 ? 'workload identity' : 'workload identities'}</p>
	</div>
	<GuardedButton permission="workloadidentity.create" class="button is-icon-left" href="/workload-identity/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
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
							<a class="link cell-name" href="/workload-identity/detail?project={project}&location={it.location}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td>
							<span class="loc-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}</span>
						</td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={workloadIdentities} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
