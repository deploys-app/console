<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')
		const deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error.message === 'api: deployment not found') {
				return {
					status: 302,
					redirect: '/deployment'
				}
			}
			return {
				status: 500,
				error: `deployment: ${deployment.error.message}`
			}
		}
		return {
			props: {
				location,
				name,
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
	import { setContext } from 'svelte'
	import { page } from '$app/stores'
	import Header from './_components/Header.svelte'
	import { writable } from 'svelte/store'

	export let location
	export let name
	export let deployment

	$: project = $page.stuff.project
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
	<Header {deployment} />

	<slot />
</div>
