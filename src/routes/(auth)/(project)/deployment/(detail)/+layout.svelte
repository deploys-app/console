<script>
	import Header from '../_components/Header.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: deployment = data.deployment

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('deployment.get')
		if (deployment.status !== 'pending') {
			return 300000
		}
	}, 4000))
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/deployment?project=${project}`} class="link"><h6>Deployments</h6></a>
		</li>
		<li>
			<h6>{deployment.name}</h6>
		</li>
	</ul>
</div>
<br>
<div class="panel _dp-g _gg-24px">
	<Header {deployment} on:invalidate={() => api.invalidate('deployment.get')} />

	<slot />
</div>
