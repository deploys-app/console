<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const routes = $derived(data.routes)
	const error = $derived(data.error)

	/**
	 * @param {Api.Route} route
	 */
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
			<a class="nm-button" href={`/route/create?project=${project}`}>
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
				<th>Config</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each routes as it (`${it.domain}${it.path}-${it.location}`)}
					<tr>
						<td>
							<a class="nm-link _tdcrt-udl"
							   href={`https://${it.domain}${it.path}`}
							   target="_blank">https://{it.domain}{it.path}</a>
						</td>
						<td>{it.target}</td>
						<td>{it.location}</td>
						<td>
							{#if it.config.basicAuth}
								<i class="fa-solid fa-lock"></i>
							{/if}
						</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<button class="icon-button" aria-label="Remove" onclick={() => deleteRoute(it)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={routes} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
