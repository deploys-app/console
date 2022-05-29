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
				locations: locations.result.items || []
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	export let locations

	$: project = $page.stuff.project

	let form = {
		domain: '',
		path: '',
		location: '',
		targetPrefix: '',
		targetValue: ''
	}

	$: currentLocation = locations.find((x) => x.id === form.location)
	$: targetPlaceholder = {
		'redirect://': 'https://example.com',
		'ipfs://': 'QmUVTKsrYJpaxUT7dr9FpKq6AoKHhEM7eG1ZHGL56haKLG',
		'ipns://': 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew',
	}[form.targetPrefix] || ''

	let deployments = []

	async function fetchDeployments () {
		deployments = []
		form.target = ''

		const resp = await api.invoke('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result.items || []
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
			const resp = await api.invoke('route.createV2', {
				project,
				location: form.location,
				domain: form.domain,
				path: form.path,
				target: `${form.targetPrefix}${form.targetValue}`
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
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
				<input id="input-domain" bind:value={form.domain}>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-path">Path</label>
			<div class="moon-input">
				<input id="input-path" bind:value={form.path}>
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
			<label for="input-target_prefix">Type</label>
			<div class="moon-select">
				<select id="input-target_prefix" bind:value={form.targetPrefix} on:change={() => form.targetValue = ''} required>
					<option value="" selected disabled>Select Type</option>
					<option value="deployment://">Deployment</option>
					<option value="redirect://">Redirect</option>
					<option value="ipfs://">IPFS</option>
					<option value="ipns://">IPNS</option>
					<option value="dnslink://">DNSLink</option>
				</select>
			</div>
		</div>

		{#if form.targetPrefix === 'deployment://'}
			<div class="moon-field _mgbt-20px">
				<label for="input-target_deployment">Deployments</label>
				<div class="moon-select">
					<select id="input-target_deployment" bind:value={form.targetValue} required>
						<option value="" selected disabled>Select Deployment</option>
						{#each deployments as it}
							<option value={it}>{it}</option>
						{/each}
					</select>
				</div>
			</div>
		{:else if form.targetPrefix && form.targetPrefix !== 'dnslink://'}
			<div class="moon-field _mgbt-20px">
				<label for="input-target_value">Value</label>
				<div class="moon-input">
					<input id="input-target_value" bind:value={form.targetValue} placeholder={targetPlaceholder} required>
				</div>
			</div>
		{/if}
		<hr>

		<button class="moon-button _mgr-at" class:-loading={saving}>Save</button>
	</form>

	{#if currentLocation}
		<div class="_w-100pct _mxw-512px _mgv-30px">
				<pre class="_wsp-pl">
					Add DNS Record CNAME to<br>{currentLocation.cname}
					{#if currentLocation.endpoint}
						<br>or A Record to<br>{currentLocation.endpoint}<br>
					{/if}
					We're under DDoS, our IPs require Cloudflare proxy to access.
				</pre>
		</div>
	{/if}
</div>
