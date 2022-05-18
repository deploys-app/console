<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const disks = await api.invoke('disk.list', { project }, fetch)
		if (!disks.ok) {
			return {
				status: 500,
				error: `disks: ${disks.error.message}`
			}
		}
		return {
			props: {
				disks: disks.result.list || []
			},
			dependencies: ['disks']
		}
	}
</script>

<script>
	import { onDestroy } from 'svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import format from '$lib/format'
	import { page } from '$app/stores'
	import { browser } from '$app/env'
	import { invalidate } from '$app/navigation'
	import { loading } from '$lib/stores'

	export let disks

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			let hasPending = disks.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => invalidate('disks'), 2000)
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
<div class="moon-panel _dp-g _gg-24px">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/disk/create?project=${project}`}>
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
			{#if $loading}
				<LoadingRow span="5" />
			{:else}
				{#each disks as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/disk/detail?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.size} GiB</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}}</td>
						<td>
							<a href={`/disk/create?project=${project}&location=${it.location}&name=${it.name}`}>
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
