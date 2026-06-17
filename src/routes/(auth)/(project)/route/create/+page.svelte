<script lang="ts">
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { routeTargetMeta } from '$lib/route'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

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

	const targetPlaceholder = $derived(routeTargetMeta[form.targetPrefix]?.placeholder ?? '')
	const targetHint = $derived(routeTargetMeta[form.targetPrefix]?.hint ?? '')

	let domains = $state<Api.Domain[]>([])
	let deployments = $state<{ name: string, paused: boolean }[]>([])

	const selectedDomain = $derived(domains.find((x) => x.domain === form.domain))

	// Paused deployments stay selectable so a route can be wired up ahead of a
	// resume, but the picker flags them and we warn that traffic won't flow until
	// the deployment is running again.
	const deploymentOptions = $derived(deployments.map((d) => ({
		value: d.name,
		label: d.name,
		dot: (d.paused ? 'warning' : 'positive') as 'warning' | 'positive',
		badge: d.paused ? 'Paused' : undefined,
		badgeTone: 'warning' as const
	})))

	const selectedDeploymentPaused = $derived(
		form.targetPrefix === 'deployment://' &&
		deployments.some((d) => d.name === form.targetValue && d.paused)
	)

	async function fetchDomains () {
		domains = []
		form.domain = ''

		const resp = await api.invoke<Api.List<Api.Domain>>('domain.list', { project, location: form.location }, fetch)
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

		const resp = await api.invoke<Api.List<Api.Deployment>>('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result?.items ?? []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.type === 'WebService' || x.type === 'Static')
			.filter((x) => x.ttl === 0)
			.map((x) => ({ name: x.name, paused: x.action === 'pause' }))
	}

	function fetchLocationData () {
		fetchDomains()
		fetchDeployments()
	}

	let saving = $state(false)

	async function save (e: SubmitEvent) {
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/route?project=${project}`} class="link"><h6>Routes</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="page-head">
	<div>
		<h4><strong>Create route</strong></h4>
		<p class="page-sub">Forward traffic on a domain path to a deployment.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-location">Location</label>
			<Select
				id="input-location"
				bind:value={form.location}
				onchange={fetchLocationData}
				required
				placeholder="Select Location"
				options={locations.map((it) => ({ value: it.id, label: it.id }))} />
		</div>

		{#if form.location}
			<div class="field">
				<label for="input-domain">Domain</label>
				<Select
					id="input-domain"
					bind:value={form.domain}
					required
					placeholder="Select Domain"
					options={domains.map((it) => ({ value: it.domain, label: (it.wildcard ? '*.' : '') + it.domain }))} />
			</div>

			{#if selectedDomain?.wildcard}
				<div class="field">
					<label for="input-subdomain">Subdomain</label>
					<div class="input -has-icon-right">
						<input id="input-subdomain" bind:value={form.subdomain}>
						<input class="icon -is-right px-2 w-auto" value={`.${form.domain}`} size={form.domain.length} readonly disabled>
					</div>
				</div>
			{/if}

			<div class="field">
				<label for="input-path">Path</label>
				<div class="input">
					<input id="input-path" bind:value={form.path}>
				</div>
			</div>

			<div class="field">
				<label for="input-target_prefix">Type</label>
				<Select
					id="input-target_prefix"
					bind:value={form.targetPrefix}
					onchange={() => form.targetValue = ''}
					required
					placeholder="Select Type"
					options={[
						{ value: 'deployment://', label: 'Deployment' },
						{ value: 'redirect://', label: 'Redirect' },
						{ value: 'http://', label: 'External server (HTTP)' }
					]} />
			</div>

			{#if form.targetPrefix === 'deployment://'}
				<div class="field">
					<label for="input-target_deployment">Deployments</label>
					<Select
						id="input-target_deployment"
						bind:value={form.targetValue}
						required
						placeholder="Select Deployment"
						options={deploymentOptions} />
					{#if selectedDeploymentPaused}
						<p class="page-sub text-warning flex items-center gap-2">
							<i class="fa-solid fa-triangle-exclamation"></i>
							This deployment is paused — the route won’t serve traffic until you resume it.
						</p>
					{/if}
				</div>
			{:else if form.targetPrefix}
				<div class="field">
					<label for="input-target_value">Value</label>
					<div class="input">
						<input id="input-target_value" bind:value={form.targetValue} placeholder={targetPlaceholder} required>
					</div>
					{#if targetHint}
						<p class="page-sub">{targetHint}</p>
					{/if}
				</div>
			{/if}

			<div class="field mt-3">
				<h6><strong>Advanced Settings</strong></h6>
			</div>

			<div class="field">
				<div class="checkbox">
					<input id="input-enable_basic_auth" type="checkbox" bind:checked={form.config.enableBasicAuth}>
					<label for="input-enable_basic_auth">Basic Auth</label>
				</div>
			</div>

			{#if form.config.enableBasicAuth}
				<div class="field">
					<label for="input-basic_auth_user">User</label>
					<div class="input">
						<input id="input-basic_auth_user" bind:value={form.config.basicAuth.user} required>
					</div>
				</div>

				<div class="field">
					<label for="input-basic_auth_password">Password</label>
					<div class="input">
						<input id="input-basic_auth_password" type="password" bind:value={form.config.basicAuth.password} required>
					</div>
				</div>
			{/if}

			<hr>

			<GuardedButton permission="route.create" type="submit" class="button mr-auto" loading={saving}>Save</GuardedButton>
		{/if}
	</form>
</div>
