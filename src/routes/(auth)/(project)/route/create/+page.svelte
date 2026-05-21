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
		'redirect://': 'https://example.com'
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
		form.targetValue = ''

		const resp = await api.invoke('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result.items ?? []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.type === 'WebService')
			.filter((x) => x.ttl === 0)
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
<div class="nm-panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>Create route</strong></h3>
		</div>
	</div>
	<hr>
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} onchange={fetchLocationData} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it (it.id)}
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
						{#each domains as it (it.domain)}
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
						<input class="icon -is-right px-2 w-auto" value={`.${form.domain}`} size={form.domain.length} readonly disabled>
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
					</select>
				</div>
			</div>

			{#if form.targetPrefix === 'deployment://'}
				<div class="nm-field">
					<label for="input-target_deployment">Deployments</label>
					<div class="nm-select">
						<select id="input-target_deployment" bind:value={form.targetValue} required>
							<option value="" selected disabled>Select Deployment</option>
							{#each deployments as it (it)}
								<option value={it}>{it}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else if form.targetPrefix}
				<div class="nm-field">
					<label for="input-target_value">Value</label>
					<div class="nm-input">
						<input id="input-target_value" bind:value={form.targetValue} placeholder={targetPlaceholder} required>
					</div>
				</div>
			{/if}

			<div class="nm-field mt-3">
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

			<button class="nm-button mr-auto" class:is-loading={saving}>Save</button>
		{/if}
	</form>
</div>
