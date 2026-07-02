<script lang="ts">
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'
	import type { PageData } from './$types'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const routes = $derived(data.routes)
	const error = $derived(data.error)

	$effect(() => {
		if (!can('route.create')) return
		return registerPageActions([{
			id: 'route-list:create',
			label: 'Create',
			icon: 'fa-plus',
			keywords: 'create new add route',
			href: `/route/create?project=${project}`
		}])
	})

	function openRoute (route: Api.Route) {
		goto(`/route/manage?project=${project}` +
			`&location=${encodeURIComponent(route.location)}` +
			`&domain=${encodeURIComponent(route.domain)}` +
			`&path=${encodeURIComponent(route.path)}`)
	}

	function onRowKey (e: KeyboardEvent, route: Api.Route) {
		// Only the row itself drives navigation; inner buttons handle their own keys.
		if (e.target !== e.currentTarget) return
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			openRoute(route)
		}
	}

	function deleteRoute (route: Api.Route) {
		modal.confirm({
			title: `Delete route ${route.domain}${route.path} in ${route.location}?`,
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

<div class="page-head">
	<div>
		<h4><strong>Routes</strong></h4>
		<p class="page-sub">{routes.length} {routes.length === 1 ? 'route' : 'routes'}</p>
	</div>
	<GuardedButton permission="route.create" class="button is-icon-left" href={`/route/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
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
					<tr class="route-row" role="button" tabindex="0"
						onclick={() => openRoute(it)}
						onkeydown={(e) => onRowKey(e, it)}>
						<td><span class="cell-name">https://{it.domain}{it.path}</span></td>
						<td><span class="cell-muted">{it.target}</span></td>
						<td>
							<span class="loc-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}</span>
						</td>
						<td>
							{#if it.config?.basicAuth}
								<i class="fa-solid fa-lock" title="Basic auth"></i>
							{/if}
							{#if it.config?.forwardAuth}
								<i class="fa-solid fa-shield-halved" title="Forward auth"></i>
							{/if}
						</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<div class="flex gap-1 justify-end">
								<a class="icon-button" aria-label="Open route in new tab"
								   href={`https://${it.domain}${it.path}`}
								   target="_blank" rel="noreferrer"
								   onclick={(e) => e.stopPropagation()}>
									<i class="fa-solid fa-arrow-up-right-from-square"></i>
								</a>
								<span class="inline-flex" title={can('route.delete') ? null : denyTooltip('route.delete')}>
									<button class="icon-button" type="button" aria-label="Remove"
										disabled={!can('route.delete')}
										onclick={(e) => { e.stopPropagation(); deleteRoute(it) }}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</span>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={routes} {error} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	.route-row {
		cursor: pointer;
	}

	.route-row:hover {
		background-color: hsl(var(--hsl-content) / 0.04);
	}
</style>
