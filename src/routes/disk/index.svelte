<script>
	import { onDestroy } from 'svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
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
		list = await api.disk.list({ project: $project })
		hasPending = list.some((x) => x.status === 'pending')

		if (hasPending) {
			pendingTimeout = setTimeout(() => reloadList(), 2000)
		}
	}

	onDestroy(() => {
		clearTimeout(pendingTimeout)
	})
</script>

<h6>Disks</h6>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/disk/create?project=${$project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table">
			<thead>
			<tr>
				<th>Disk name</th>
				<th>Size</th>
				<th>Location</th>
				<th>Created at</th>
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<LoadingRow span="5" />
			{:else}
				{#each list as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/disk/detail?project=${$project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.size} GiB</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}}</td>
						<td>
							<a href={`/disk/create?project=${$project}&location=${it.location}&name=${it.name}`}>
								<div class="moon-icon-button -secondary">
									<i class="fas fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{:else}
					<NoDataRow span="5" />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
