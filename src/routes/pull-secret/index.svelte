<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const pullSecrets = await api.invoke('pullSecret.list', { project }, fetch)
		if (!pullSecrets.ok && !pullSecrets.error.forbidden) {
			return {
				status: 500,
				error: `pullSecrets: ${pullSecrets.error.message}`
			}
		}
		return {
			props: {
				permission: {
					pullSecrets: !pullSecrets.error?.forbidden
				},
				pullSecrets: pullSecrets.result?.pullSecrets || []
			},
			dependencies: ['pullSecrets']
		}
	}
</script>

<script>
	import { onDestroy } from 'svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import format from '$lib/format'
	import { page } from '$app/stores'
	import { browser } from '$app/env'
	import { invalidate } from '$app/navigation'
	import { loading } from '$lib/stores'

	export let permission
	export let pullSecrets

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			let hasPending = pullSecrets.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => invalidate('pullSecrets'), 2000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}
</script>

<h6>Pull Secrets</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/pull-secret/create?project=${project}`}>
                Create
            </a>
		</div>
	</div>

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
			{#if $loading}
				<LoadingRow span="4" />
			{:else}
				{#each pullSecrets as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/pull-secret/detail?project=${project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
					</tr>
				{:else}
					<NoDataRow span="4" forbidden={!permission.pullSecrets} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
