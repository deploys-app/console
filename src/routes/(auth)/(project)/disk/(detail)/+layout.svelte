<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import api from '$lib/api'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { page } from '$app/stores'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'
	import type { LayoutData } from './$types'

	const { data, children }: { data: LayoutData, children: Snippet } = $props()

	const project = $derived(data.project)
	const disk = $derived(data.disk)

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('disk.get')
		if (disk.status !== 'pending') {
			return 300000
		}
	}, 4000))

	// Registered in the layout so the Update action is available on both disk tabs;
	// mirrors the detail tab's GuardedButton (disk.update).
	const { can } = getPermissionContext()
	$effect(() => {
		if (!can('disk.update')) return
		return registerPageActions([{
			id: 'disk-detail:update',
			label: 'Update',
			icon: 'fa-pen',
			keywords: 'edit modify update resize disk',
			href: `/disk/create?project=${project}&location=${disk.location}&name=${disk.name}`
		}])
	})
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/disk?project=${project}`} class="link"><h6>Disks</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{disk.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="flex flex-wrap items-center gap-y-2 min-w-0">
			<StatusIcon status={disk.status} />
			<strong class="min-w-0 wrap-anywhere">{disk.name}</strong>
		</h4>
		<p class="page-sub">Persistent disk in <span class="font-mono">{disk.location}</span></p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="tabs is-variant-underline w-full flex-col lg:flex-row">
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/disk/metrics'}
			href={`/disk/metrics?project=${project}&location=${disk.location}&name=${disk.name}`}>
			Metric
		</a>
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/disk/detail'}
			href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`}>
			Details
		</a>
	</div>

	{@render children?.()}
</div>
