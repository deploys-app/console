<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: routes = data.routes

	function deleteRoute (route) {
		modal.confirm({
			title: `Delete route ${route.domain}${route.path} in ${route.location} ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('route.delete', {
					project,
					location: route.location,
					domain: route.domain,
					path: route.path
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('route.list')
			}
		})
	}
</script>

<h6>Routes</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="button -small" href={`/route/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
			<tr>
				<th>Route</th>
				<th>Target</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span={4} />
			{:else}
				{#each routes as it}
					<tr>
						<td>
							<a class="link _tdcrt-udl" href={`https://${it.domain}${it.path}`} target="_blank">https://{it.domain}{it.path}</a>
						</td>
						<td>{it.target}</td>
						<td>{it.location}</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<button class="icon-button" on:click={() => deleteRoute(it)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span={4} forbidden={!permission.routes} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
