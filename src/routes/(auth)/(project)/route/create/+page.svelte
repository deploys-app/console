<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

	const form = $state({
		domain: '',
		subdomain: '',
		path: '',
		location: '',
		targetPrefix: '',
		targetValue: '',
		config: {
			enableBasicAuth: false,
			basicAuth: {
				user: '',
				password: ''
			}
			// TODO: add forwardAuth
		}
	})

	const targetPlaceholder = $derived({
		'redirect://': 'https://example.com',
		'ipfs://': 'QmUVTKsrYJpaxUT7dr9FpKq6AoKHhEM7eG1ZHGL56haKLG',
		'ipns://': 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew'
	}[form.targetPrefix] || '')

	/** @type {Api.Domain[]} */
	let domains = $state([])
	let deployments = $state([])

	const selectedDomain = $derived(domains.find((x) => x.domain === form.domain))

	async function fetchDomains () {
		domains = []
		form.domain = ''

		/** @type {Api.Response<Api.List<Api.Domain>>} */
		const resp = await api.invoke('domain.list', { project, location: form.location }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result?.items ?? []
		domains = list
			.filter((x) => x.status === 'success')
	}

	async function fetchDeployments () {
		deployments = []
		form.target = ''

		const resp = await api.invoke('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result.items ?? []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.type === 'WebService')
			.map((x) => x.name)
	}

	function fetchLocationData () {
		fetchDomains()
		fetchDeployments()
	}

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

		if (saving) {
			return
		}

		if (!selectedDomain) return

		const subdomain = form.subdomain.trim()
		let domain = form.domain
		if (selectedDomain.wildcard && subdomain !== '') {
			domain = `${subdomain}.${domain}`
		}

		saving = true
		try {
			const resp = await api.invoke('route.createV2', {
				project,
				location: form.location,
				domain,
				path: form.path,
				target: `${form.targetPrefix}${form.targetValue}`,
				config: {
					basicAuth: form.config.enableBasicAuth
						? {
							user: form.config.basicAuth.user,
							password: form.config.basicAuth.password
						}
						: null
				}
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/route?project=${project}`} class="nm-link"><h6>Routes</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Create route</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} onchange={fetchLocationData} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if form.location}
			<div class="nm-field">
				<label for="input-domain">Domain</label>
				<div class="nm-select">
					<select id="input-domain" bind:value={form.domain} required>
						<option value="" selected disabled>Select Domain</option>
						{#each domains as it}
							<option value={it.domain}>{#if it.wildcard}*.{/if}{it.domain}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedDomain?.wildcard}
				<div class="nm-field">
					<label for="input-subdomain">Subdomain</label>
					<div class="nm-input -has-icon-right">
						<input id="input-subdomain" bind:value={form.subdomain}>
						<input class="icon -is-right _pdh-4 _w-at" value={`.${form.domain}`} size={form.domain.length} readonly disabled>
					</div>
				</div>
			{/if}

			<div class="nm-field">
				<label for="input-path">Path</label>
				<div class="nm-input">
					<input id="input-path" bind:value={form.path}>
				</div>
			</div>

			<div class="nm-field">
				<label for="input-target_prefix">Type</label>
				<div class="nm-select">
					<select id="input-target_prefix" bind:value={form.targetPrefix} onchange={() => form.targetValue = ''} required>
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
				<div class="nm-field">
					<label for="input-target_deployment">Deployments</label>
					<div class="nm-select">
						<select id="input-target_deployment" bind:value={form.targetValue} required>
							<option value="" selected disabled>Select Deployment</option>
							{#each deployments as it}
								<option value={it}>{it}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else if form.targetPrefix && form.targetPrefix !== 'dnslink://'}
				<div class="nm-field">
					<label for="input-target_value">Value</label>
					<div class="nm-input">
						<input id="input-target_value" bind:value={form.targetValue} placeholder={targetPlaceholder} required>
					</div>
				</div>
			{/if}

			<div class="nm-field _mgt-5">
				<h6><strong>Advanced Settings</strong></h6>
			</div>

			<div class="nm-field">
				<div class="nm-checkbox">
					<input id="input-enable_basic_auth" type="checkbox" bind:checked={form.config.enableBasicAuth}>
					<label for="input-enable_basic_auth">Basic Auth</label>
				</div>
			</div>

			{#if form.config.enableBasicAuth}
				<div class="nm-field">
					<label for="input-basic_auth_user">User</label>
					<div class="nm-input">
						<input id="input-basic_auth_user" bind:value={form.config.basicAuth.user} required>
					</div>
				</div>

				<div class="nm-field">
					<label for="input-basic_auth_password">Password</label>
					<div class="nm-input">
						<input id="input-basic_auth_password" type="password" bind:value={form.config.basicAuth.password} required>
					</div>
				</div>
			{/if}

			<hr>

			<button class="nm-button _mgr-at" class:is-loading={saving}>Save</button>
		{/if}
	</form>
</div>
