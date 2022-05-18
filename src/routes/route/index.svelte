<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const routes = await api.invoke('route.list', { project }, fetch)
		if (!routes.ok) {
			return {
				status: 500,
				error: `routes: ${routes.error.message}`
			}
		}
		return {
			props: {
				routes: routes.result.items || []
			}
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'

	export let routes

	$: project = $page.stuff.project

	function deleteRoute (route) {
		console.log(route)
	}
</script>

<h6>Routes</h6>
<br>
<div class="moon-panel _dp-g _gg-24px">
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
						<td>{it.deployment}</td>
						<td>{it.location}</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
<!--							<form method="POST" action="{{route "route.delete" $.Page.ProjectParam}}"-->
<!--									  data-confirm="Remove route {{.Domain}}{{.Path}} in {{.Location}} ?"-->
<!--									  data-confirm-yes="Remove" data-confirm-danger>-->
<!--									<input type="hidden" name="domain" value="{{.Domain}}">-->
<!--							<input type="hidden" name="path" value="{{.Path}}">-->
<!--							<input type="hidden" name="location" value="{{.Location}}">-->
							<button class="moon-icon-button -negative" on:click={() => deleteRoute(it)}>
								<i class="fas fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span="4" />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
