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
		subdomain: '',
		path: '',
		location: '',
		targetPrefix: '',
		targetValue: ''
	}

	$: targetPlaceholder = {
		'redirect://': 'https://example.com',
		'ipfs://': 'QmUVTKsrYJpaxUT7dr9FpKq6AoKHhEM7eG1ZHGL56haKLG',
		'ipns://': 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew',
	}[form.targetPrefix] || ''

	let domains = []
	let deployments = []

	$: selectedDomain = domains.find((x) => x.domain === form.domain)

	async function fetchDomains () {
		domains = []
		form.domain = ''

		const resp = await api.invoke('domain.list', { project, location: form.location }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		domains = resp.result.items || []
	}

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

	function fetchLocationData () {
		fetchDomains()
		fetchDeployments()
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		const subdomain = form.subdomain.trim()
		let domain = form.domain
		if (selectedDomain.type === 'wildcard' && subdomain !== '') {
			domain = `${subdomain}.${domain}`
		}

		saving = true
		try {
			const resp = await api.invoke('route.createV2', {
				project,
				location: form.location,
				domain,
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
		<div class="moon-field _mgbt-20px">
			<label for="input-location">Location</label>
			<div class="moon-select">
				<select id="input-location" bind:value={form.location} on:change={fetchLocationData} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if form.location}
			<div class="moon-field _mgbt-20px">
				<label for="input-domain">Domain</label>
				<div class="moon-select">
					<select id="input-domain" bind:value={form.domain} required>
						<option value="" selected disabled>Select Domain</option>
						{#each domains as it}
							<option value={it.domain}>{#if it.type === 'wildcard'}*.{/if}{it.domain}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedDomain?.type === 'wildcard'}
				<div class="moon-field">
					<label for="input-subdomain">Subdomain</label>
					<div class="moon-input -has-icon-right">
						<input id="input-subdomain" bind:value={form.subdomain}>
						<input class="icon -is-right _pdh-8px _w-at" value={`.${form.domain}`} size={form.domain.length} readonly disabled>
					</div>
				</div>
			{/if}

			<div class="moon-field">
				<label for="input-path">Path</label>
				<div class="moon-input">
					<input id="input-path" bind:value={form.path}>
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
		{/if}
	</form>
</div>
