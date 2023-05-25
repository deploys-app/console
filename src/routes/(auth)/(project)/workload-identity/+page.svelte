<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: workloadIdentities = data.workloadIdentities

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('workloadIdentity.list')
	}, 5000))
</script>

<h6>Workload Identities</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="button -small" href={`/workload-identity/create?project=${project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
			<tr>
				<th>Name</th>
				<th>Location</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span={3} />
			{:else}
				{#each workloadIdentities as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="link" href={`/workload-identity/detail?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{:else}
					<NoDataRow span={3} forbidden={!permission.workloadIdentities} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
