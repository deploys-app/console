<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const routes = await api.invoke('route.listv2', { project }, fetch)
		if (!routes.ok && !routes.error.forbidden) {
			return {
				status: 500,
				error: `routes: ${routes.error.message}`
			}
		}
		return {
			props: {
				permission: {
					routes: !routes.error?.forbidden
				},
				routes: routes.result || []
			},
			dependencies: ['routes']
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import { invalidate } from '$app/navigation'

	export let permission
	export let routes

	$: project = $page.stuff.project

	function deleteRoute (route) {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete route ${route.domain}${route.path} in ${route.location} ?`,
				yes: 'Delete',
				callback: async () => {
					const result = await api.invoke('route.delete', {
						project,
						location: route.location,
						domain: route.domain,
						path: route.path
					}, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await invalidate('routes')
				}
			}
		}))
	}
</script>

<h6>Routes</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/route/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table">
			<thead>
			<tr>
				<th>Route</th>
				<th>Deployment</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="4" />
			{:else}
				{#each routes as it}
					<tr>
						<td>
							<a class="moon-link _tdcrt-udl" href={`https://${it.domain}${it.path}`} target="_blank">https://{it.domain}{it.path}</a>
						</td>
						<td>{it.target}</td>
						<td>{it.location}</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<button class="moon-icon-button -negative" on:click={() => deleteRoute(it)}>
								<i class="fas fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span="4" forbidden={!permission.routes} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
