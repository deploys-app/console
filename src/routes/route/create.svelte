<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff

		const locations = await api.invoke('location.list', { project }, fetch)
		if (!locations.ok) {
			return {
				status: 500,
				error: `locations: ${locations.error.message}`
			}
		}

		return {
			props: {
				locations: locations.result.locations || []
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let locations

	$: project = $page.stuff.project

	let form = {
		domain: '',
		path: '',
		location: '',
		target: ''
	}

	$: currentLocation = locations.find((x) => x.id === form.location)

	let deployments = []

	async function fetchDeployments () {
		deployments = []
		form.target = ''

		const resp = await api.invoke('deployment.list', { project }, fetch)
		if (!resp.ok) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: resp.error
				}
			}))
			return
		}
		const list = resp.result.deployments || []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.type === 'WebService')
			.map((x) => x.name)
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('route.create', {
				project,
				location: form.location,
				domain: form.domain,
				path: form.path,
				deployment: form.target
			}, fetch)
			if (!resp.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: resp.error
					}
				}))
				return
			}
			goto(`/route?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/route?project=${project}`} class="moon-link"><h6>Routes</h6></a>
		</li>
		<li>
			<h6>Create</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Create route</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<label for="input-domain">Domain</label>
			<div class="moon-input">
				<input id="input-domain" value={form.domain}>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-path">Path</label>
			<div class="moon-input">
				<input id="input-path" value={form.path}>
			</div>
		</div>
		<div class="moon-field _mgbt-20px">
			<label for="input-location">Location</label>
			<div class="moon-select">
				<select id="input-location" bind:value={form.location} on:change={fetchDeployments} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="moon-field _mgbt-20px">
			<label for="input-target">Deployments</label>
			<div class="moon-select">
				<select id="input-target" bind:value={form.target} required>
					<option value="" selected disabled>Select Deployment</option>
					{#each deployments as it}
						<option value={it}>{it}</option>
					{/each}
				</select>
			</div>
		</div>
		<hr>

		<button class="moon-button _mgr-at" class:-loading={saving}>Save</button>
	</form>

	{#if currentLocation}
		<div class="_w-100pct _mxw-512px _mgv-30px">
				<pre class="_wsp-pl">
					Add DNS Record CNAME to<br>{currentLocation.cname}<br><br>
					or A Record to<br>{currentLocation.endpoint}
				</pre>
		</div>
	{/if}
</div>
