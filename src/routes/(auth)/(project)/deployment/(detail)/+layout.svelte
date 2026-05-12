<script>
	import Header from '../_components/Header.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'

	const { data, children } = $props()

	const project = $derived(data.project)
	const deployment = $derived(data.deployment)

	let lastReload = Date.now()

	onMount(() => api.intervalInvalidate(async () => {
		if (deployment.status !== 'pending' && Date.now() - lastReload < 120000) {
			return
		}
		await api.invalidate('deployment.get')
		lastReload = Date.now()
	}, 4000))
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/deployment?project=${project}`} class="nm-link"><h6>Deployments</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{deployment.name}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<Header {deployment} invalidate={() => api.invalidate('deployment.get')} />

	{@render children?.()}
</div>
