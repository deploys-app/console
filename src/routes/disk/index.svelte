<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const disks = await api.invoke('disk.list', { project }, fetch)
		if (!disks.ok && !disks.error.forbidden) {
			return {
				status: 500,
				error: `disks: ${disks.error.message}`
			}
		}
		return {
			props: {
				permission: {
					disks: !disks.error?.forbidden
				},
				disks: disks.result?.items || []
			}
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
	import { loading } from '$lib/stores'

	export let permission
	export let disks

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			const hasPending = disks.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => api.invalidate('disk.list'), 2000)
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
				<LoadingRow span="5" />
			{:else}
				{#each disks as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a sveltekit:prefetch class="link" href={`/disk/detail?project=${project}&location=${it.location}&name=${it.name}`}>
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
					<NoDataRow span="5" forbidden={!permission.disks} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
