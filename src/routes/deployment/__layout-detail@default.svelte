<script>
	import { page } from '$app/stores'
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import Header from './_components/Header.svelte'

	const location = $page.url.searchParams.get('location')
	const name = $page.url.searchParams.get('name')

	let detail

	$: {
		$project
		reloadDetail()
	}

	async function reloadDetail () {
		detail = await api.deployment.get({ project: $project, location, name })
	}
</script>

{#if detail == null}
	Loading...
{:else}
	<div>
		<ul class="moon-breadcrumb">
			<li>
				<a href={`/deployment?project=${$project}`} class="moon-link"><h6>Deployments</h6></a>
			</li>
			<li>
				<h6>{detail.name}</h6>
			</li>
		</ul>
	</div>
	<br>
	<div class="moon-panel _dp-g _gg-24px">
		<Header detail={detail} />

		<slot detail={detail} />
	</div>
{/if}
