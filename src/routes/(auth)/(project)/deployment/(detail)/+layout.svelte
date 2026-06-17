<script lang="ts">
	import Header from '../_components/Header.svelte'
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'

	const { data, children }: { data: LayoutData, children: Snippet } = $props()

	const project = $derived(data.project)
	const deployment = $derived(data.deployment)

	// A Static deployment runs no pods, so it has no logs or k8s events — hide
	// those tabs (the metrics tab stays but drops the pod-only charts).
	const tabs = $derived([
		{ label: 'Metrics', path: '/deployment/metrics' },
		{ label: 'Details', path: '/deployment/detail' },
		{ label: 'Revisions', path: '/deployment/revision' },
		...(deployment.type === 'Static'
			? []
			: [
				{ label: 'Logs', path: '/deployment/logs' },
				{ label: 'Events', path: '/deployment/events' }
			])
	])

	function tabHref (path: string): string {
		return `${path}?project=${project}&location=${deployment.location}&name=${deployment.name}`
	}

	let lastReload = Date.now()

	onMount(() => api.intervalInvalidate(async () => {
		if (deployment.status !== 'pending' && Date.now() - lastReload < 120000) {
			return
		}
		await api.invalidate('deployment.get')
		lastReload = Date.now()
	}, 4000))
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/deployment?project=${project}`} class="link"><h6>Deployments</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{deployment.name}</h6>
	</div>
</div>

<br>

<Header {deployment} invalidate={() => api.invalidate('deployment.get')} />

<!-- grid-cols-1 (= `grid-template-columns: repeat(1, minmax(0, 1fr))`) lets
     wide children (Metrics chart cards, Logs/Events scan-line surfaces)
     shrink with the viewport. Without it, `grid-auto-columns: auto` would
     size the implicit column to the children's max-content and push the
     page past the viewport on narrow / iPhone-sized screens. -->
<div class="panel is-level-300 grid grid-cols-1 gap-6">
	<div class="tabs is-variant-underline w-full flex-col lg:flex-row">
		{#each tabs as t (t.path)}
			<a class="tab-button" class:is-active={$page.url.pathname === t.path} href={tabHref(t.path)}>
				{t.label}
			</a>
		{/each}
	</div>

	{@render children?.()}
</div>
