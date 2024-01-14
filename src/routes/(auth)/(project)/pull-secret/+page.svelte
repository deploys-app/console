<script>
	import { onMount } from 'svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import * as format from '$lib/format'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project

	/** @type {MaybePromise<Api.Response<Api.List<Api.PullSecret>>>} */
	$: pullSecrets = data.pullSecrets

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('pullSecret.list')
		const res = await data.pullSecrets
		if (!res.ok) {
			return
		}
		pullSecrets = res
		if (!res.result.items?.some((x) => x.status === 'pending')) {
			return 300000
		}
	}, 4000))
</script>

<h6>Pull Secrets</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/pull-secret/create?project={project}">
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
				<th>Created by</th>
			</tr>
			</thead>
			<tbody>
				{#await pullSecrets}
					<LoadingRow span={4} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it (`${it.name}-${it.location}`)}
							<tr>
								<td>
									<StatusIcon status={it.status} />
									<a class="nm-link" href="/pull-secret/detail?project={project}&location={it.location}&name={it.name}">
										{it.name}
									</a>
								</td>
								<td>{it.location}</td>
								<td>{format.datetime(it.createdAt)}</td>
								<td>{it.createdBy}</td>
							</tr>
						{:else}
							<NoDataRow span={4} />
						{/each}
					{:else}
						<ErrorRow span={4} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={4} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
