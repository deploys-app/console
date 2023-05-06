<script>
	import { onDestroy } from 'svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import { browser } from '$app/environment'
	import { loading } from '$lib/stores'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: disks = data.disks

	let pendingTimeout
	$: {
		if (browser) {
			const hasPending = disks.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => api.invalidate('disk.list'), 4000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}
</script>

<h6>Disks</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href={`/disk/create?project=${project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
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
			{#if $loading}
				<LoadingRow span={5} />
			{:else}
				{#each disks as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="link" href={`/disk/detail?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.size} GiB</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<a href={`/disk/create?project=${project}&location=${it.location}&name=${it.name}`}>
								<div class="icon-button -secondary">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{:else}
					<NoDataRow span={5} forbidden={!permission.disks} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
