<script>
	import Header from '../_components/Header.svelte'
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import api from '$lib/api'

	const { data, children } = $props()

	const project = $derived(data.project)
	const deployment = $derived(data.deployment)

	const tabs = [
		{ label: 'Metrics', path: '/deployment/metrics' },
		{ label: 'Details', path: '/deployment/detail' },
		{ label: 'Revisions', path: '/deployment/revision' },
		{ label: 'Logs', path: '/deployment/logs' },
		{ label: 'Events', path: '/deployment/events' }
	]

	/** @param {string} path */
	function tabHref (path) {
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

<div class="panel is-level-300 grid gap-6">
	<div class="tabs is-variant-underline w-full flex-col lg:flex-row">
		{#each tabs as t (t.path)}
			<a class="tab-button" class:is-active={$page.url.pathname === t.path} href={tabHref(t.path)}>
				{t.label}
			</a>
		{/each}
	</div>

	{@render children?.()}
</div>
