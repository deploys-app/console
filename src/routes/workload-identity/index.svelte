<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const workloadIdentities = await api.invoke('workloadidentity.list', { project }, fetch)
		if (!workloadIdentities.ok) {
			return {
				status: 500,
				error: `workloadIdentities: ${workloadIdentities.error.message}`
			}
		}
		return {
			props: {
				workloadIdentities: workloadIdentities.result.list || []
			}
		}
	}
</script>

<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { navigating, page } from '$app/stores'
	import format from '$lib/format'

	export let workloadIdentities

	$: project = $page.stuff.project
</script>

<h6>Workload Identities</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/workload-identity/create?project=${project}`}>
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
			{#if $navigating}
				<LoadingRow span="3" />
			{:else}
				{#each workloadIdentities as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/workload-identity/detail?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{:else}
					<NoDataRow span="3" />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
