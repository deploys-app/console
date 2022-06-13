<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')
		const deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error.notFound) {
				return {
					status: 302,
					redirect: `/deployment?project=${project}`
				}
			}
			return {
				status: 500,
				error: `deployment: ${deployment.error.message}`
			}
		}
		return {
			props: {
				deployment: deployment.result
			},
			stuff: {
				location,
				name,
				deployment: deployment.result
			},
			dependencies: ['deployment']
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import Header from './_components/Header.svelte'
	import { browser } from '$app/env'
	import { invalidate } from '$app/navigation'
	import { onDestroy } from 'svelte'

	export let deployment

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			const isPending = deployment.status === 'pending'
			if (isPending) {
				pendingTimeout = setTimeout(() => invalidate('deployment'), 2000)
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
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/deployment?project=${project}`} class="moon-link"><h6>Deployments</h6></a>
		</li>
		<li>
			<h6>{deployment.name}</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<Header {deployment} on:invalidate={() => invalidate('deployment')} />

	<slot />
</div>
