<script>
	import { onDestroy } from 'svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'

	let list = null
	let hasPending
	let pendingTimeout

	project.subscribe(() => {
		reloadList()
	})

	async function reloadList () {
		const result = await api.pullSecret.list({ project: $project })
		list = result.pullSecrets
		hasPending = list.some((x) => x.status === 'pending')

		if (hasPending) {
			pendingTimeout = setTimeout(() => reloadList(), 2000)
		}
	}

	onDestroy(() => {
		clearTimeout(pendingTimeout)
	})
</script>

<h6>Pull Secrets</h6>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/pull-secret/create?project=${$project}`}>
                Create
            </a>
		</div>
	</div>

	<!--{{template "flash-error" .Page.Flash.Values "Errors"}}-->

	<div class="moon-table-container">
		<table class="moon-table">
			<thead>
			<tr>
				<th>Name</th>
				<th>Location</th>
				<th>Created at</th>
				<th>Created by</th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<LoadingRow span="4" />
			{:else}
				{#each list as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/pull-secret/detail?project=${$project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
					</tr>
				{:else}
					<NoDataRow span="4" />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
