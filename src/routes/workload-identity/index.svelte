<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const workloadIdentities = await api.invoke('workloadIdentity.list', { project }, fetch)
		if (!workloadIdentities.ok && !workloadIdentities.error.forbidden) {
			return {
				status: 500,
				error: `workloadIdentities: ${workloadIdentities.error.message}`
			}
		}
		return {
			props: {
				permission: {
					workloadIdentities: !workloadIdentities.error?.forbidden
				},
				workloadIdentities: workloadIdentities.result?.items || []
			},
			dependencies: ['workloadIdentities']
		}
	}
</script>

<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import format from '$lib/format'
	import { browser } from '$app/env'
	import { invalidate } from '$app/navigation'
	import { onDestroy } from 'svelte'

	export let permission
	export let workloadIdentities

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			let hasPending = workloadIdentities.status === 'pending'
			if (hasPending) {
				pendingTimeout = setTimeout(() => invalidate('workloadIdentities'), 2000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}
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
			{#if $loading}
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
					<NoDataRow span="3" forbidden={!permission.workloadIdentities} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
