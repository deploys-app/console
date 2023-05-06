<script>
	import { onDestroy } from 'svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import format from '$lib/format'
	import { browser } from '$app/environment'
	import { loading } from '$lib/stores'
	import api from '$lib/api'

	export let data

	/** @type {string} */
	let project
	$: project = data.project

	let permission
	$: permission = data.permission

	/** @type {import('$types').PullSecret[]} */
	let pullSecrets
	$: pullSecrets = data.pullSecrets

	let pendingTimeout
	$: {
		if (browser) {
			const hasPending = pullSecrets.some((x) => x.status === 'pending')
			if (hasPending) {
				pendingTimeout = setTimeout(() => api.invalidate('pullSecret.list'), 4000)
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
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href={`/pull-secret/create?project=${project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
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
							<a class="link" href={`/pull-secret/detail?project=${project}&location=${it.location}&name=${it.name}`}>
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
