<script>
	import Header from '../_components/Header.svelte'
	import { browser } from '$app/environment'
	import { onDestroy } from 'svelte'
	import api from '$lib/api'

	export let data
	$: ({
		project,
		deployment
	} = data)

	let pendingTimeout
	$: {
		if (browser) {
			const isPending = deployment.status === 'pending'
			if (isPending) {
				pendingTimeout = setTimeout(() => api.invalidate('deployment.get'), 4000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}
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
