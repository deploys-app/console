<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const route = $derived(data.route)

	const detailUrl = $derived(`/route/manage?project=${project}` +
		`&location=${encodeURIComponent(route.location)}` +
		`&domain=${encodeURIComponent(route.domain)}` +
		`&path=${encodeURIComponent(route.path)}`)

	// Known target schemes. deployment + redirect + http (external server) are
	// creatable in-console; the ipfs/ipns/dnslink schemes are parsed so an
	// existing route round-trips unchanged even though they aren't offered in
	// the picker. http:// is validated server-side (api.validExternalTarget).
	const targetPrefixes = ['deployment://', 'redirect://', 'http://', 'ipfs://', 'ipns://', 'dnslink://']

	/** @param {string | undefined} target */
	function splitTarget (target) {
		for (const p of targetPrefixes) {
			if (target?.startsWith(p)) return { prefix: p, value: target.slice(p.length) }
		}
		return { prefix: 'deployment://', value: target ?? '' }
	}

	/** @param {Api.Route} r */
	function buildForm (r) {
		const { prefix, value } = splitTarget(r?.target)
		const cfg = r?.config ?? {}
		return {
			targetPrefix: prefix,
			targetValue: value,
			// Basic-auth and forward-auth are mutually exclusive, so a single
			// three-way selector matches the backend constraint.
			auth: cfg.basicAuth ? 'basic' : cfg.forwardAuth ? 'forward' : 'none',
			basicAuth: {
				user: cfg.basicAuth?.user ?? '',
				password: cfg.basicAuth?.password ?? ''
			},
			forwardAuth: {
				target: cfg.forwardAuth?.target ?? '',
				requestHeaders: (cfg.forwardAuth?.authRequestHeaders ?? []).join('\n'),
				responseHeaders: (cfg.forwardAuth?.authResponseHeaders ?? []).join('\n')
			}
		}
	}

	/** @param {Api.Route} r */
	const routeKey = (r) => `${r?.location}|${r?.domain}|${r?.path}`

	let form = $state(untrack(() => buildForm(data.route)))
	let seededKey = untrack(() => routeKey(data.route))

	// Re-seed when the loader returns a different route (the component is reused
	// when navigating between edit pages with different params).
	$effect(() => {
		const r = data.route
		untrack(() => {
			const key = routeKey(r)
			if (key !== seededKey) {
				seededKey = key
				form = buildForm(r)
				if (form.targetPrefix === 'deployment://') fetchDeployments()
			}
		})
	})

	// The type picker offers deployment + redirect; if the saved route uses
	// another scheme, surface it so it stays selected and round-trips.
	const typeOptions = $derived.by(() => {
		const base = [
			{ value: 'deployment://', label: 'Deployment' },
			{ value: 'redirect://', label: 'Redirect' },
			{ value: 'http://', label: 'External server (HTTP)' }
		]
		if (!base.some((o) => o.value === form.targetPrefix)) {
			base.unshift({ value: form.targetPrefix, label: form.targetPrefix })
		}
		return base
	})

	const targetPlaceholder = $derived({
		'redirect://': 'https://example.com',
		'http://': '203.0.113.10:8080'
	}[form.targetPrefix] || '')

	const targetHint = $derived({
		'http://': 'Your server’s public IP address, with an optional port (defaults to 80). Private, loopback, and link-local addresses are not allowed.'
	}[form.targetPrefix] || '')

	/** @type {{ name: string, paused: boolean }[]} */
	let deployments = $state([])

	// Paused deployments stay selectable so a route can be wired up ahead of a
	// resume, but the picker flags them and we warn that traffic won't flow until
	// the deployment is running again.
	const deploymentOptions = $derived(deployments.map((d) => ({
		value: d.name,
		label: d.name,
		dot: /** @type {'warning' | 'positive'} */ (d.paused ? 'warning' : 'positive'),
		badge: d.paused ? 'Paused' : undefined,
		badgeTone: /** @type {'warning'} */ ('warning')
	})))

	const selectedDeploymentPaused = $derived(
		form.targetPrefix === 'deployment://' &&
		deployments.some((d) => d.name === form.targetValue && d.paused)
	)

	async function fetchDeployments () {
		deployments = []
		const resp = await api.invoke('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result?.items ?? []
		deployments = list
			.filter((/** @type {Api.Deployment} */ x) => x.location === route.location)
			.filter((/** @type {Api.Deployment} */ x) => x.type === 'WebService' || x.type === 'Static')
			.filter((/** @type {Api.Deployment} */ x) => x.ttl === 0)
			.map((/** @type {Api.Deployment} */ x) => ({ name: x.name, paused: x.action === 'pause' }))
	}

	$effect(() => {
		// Initial load: populate the deployment picker when the route targets one.
		if (untrack(() => form.targetPrefix) === 'deployment://') {
			untrack(() => { if (deployments.length === 0) fetchDeployments() })
		}
	})

	function onTypeChange () {
		// Switching type invalidates the previous value.
		form.targetValue = ''
		if (form.targetPrefix === 'deployment://') fetchDeployments()
	}

	/** @param {string} s */
	function splitLines (s) {
		return s.split('\n').map((x) => x.trim()).filter((x) => x !== '')
	}

	let saving = $state(false)

	/** @param {SubmitEvent} e */
	async function save (e) {
		e.preventDefault()
		if (saving) return

		saving = true
		try {
			const config = {
				basicAuth: form.auth === 'basic'
					? { user: form.basicAuth.user, password: form.basicAuth.password }
					: null,
				forwardAuth: form.auth === 'forward'
					? {
						target: form.forwardAuth.target,
						authRequestHeaders: splitLines(form.forwardAuth.requestHeaders),
						authResponseHeaders: splitLines(form.forwardAuth.responseHeaders)
					}
					: null
			}

			// route.createV2 upserts on (location, domain, path), so re-submitting
			// the same identity edits the existing route.
			const resp = await api.invoke('route.createV2', {
				project,
				location: route.location,
				domain: route.domain,
				path: route.path,
				target: `${form.targetPrefix}${form.targetValue}`,
				config
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await api.invalidate('route.get')
			await api.invalidate('route.list')
			goto(detailUrl)
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
		<a href={detailUrl} class="link"><h6 class="font-mono">{route.domain}{route.path}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Edit</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Edit route</strong></h4>
		<p class="page-sub">Change where this route forwards traffic and how it's protected.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-location">Location</label>
			<div class="input">
				<input id="input-location" class="font-mono" value={route.location} readonly>
			</div>
		</div>

		<div class="field">
			<label for="input-domain">Domain</label>
			<div class="input">
				<input id="input-domain" class="font-mono" value={route.domain} readonly>
			</div>
		</div>

		<div class="field">
			<label for="input-path">Path</label>
			<div class="input">
				<input id="input-path" class="font-mono" value={route.path} readonly>
			</div>
		</div>

		<div class="field">
			<label for="input-target_prefix">Type</label>
			<Select
				id="input-target_prefix"
				bind:value={form.targetPrefix}
				onchange={onTypeChange}
				required
				placeholder="Select Type"
				options={typeOptions} />
		</div>

		{#if form.targetPrefix === 'deployment://'}
			<div class="field">
				<label for="input-target_deployment">Deployment</label>
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
		{:else}
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
			<h6><strong>Authentication</strong></h6>
		</div>

		<div class="field">
			<label for="input-auth">Protect with</label>
			<Select
				id="input-auth"
				bind:value={form.auth}
				placeholder="Select"
				options={[
					{ value: 'none', label: 'None' },
					{ value: 'basic', label: 'Basic Auth' },
					{ value: 'forward', label: 'Forward Auth' }
				]} />
		</div>

		{#if form.auth === 'basic'}
			<div class="field">
				<label for="input-basic_auth_user">User</label>
				<div class="input">
					<input id="input-basic_auth_user" bind:value={form.basicAuth.user} required>
				</div>
			</div>

			<div class="field">
				<label for="input-basic_auth_password">Password</label>
				<div class="input">
					<input id="input-basic_auth_password" type="password" bind:value={form.basicAuth.password} required>
				</div>
			</div>
		{:else if form.auth === 'forward'}
			<div class="field">
				<label for="input-forward_auth_target">Target</label>
				<div class="input">
					<input id="input-forward_auth_target" bind:value={form.forwardAuth.target} placeholder="https://auth.example.com/verify" required>
				</div>
			</div>

			<div class="field">
				<label for="input-forward_auth_request_headers">Request headers</label>
				<div class="textarea">
					<textarea id="input-forward_auth_request_headers" rows="3"
						bind:value={form.forwardAuth.requestHeaders}
						placeholder="One header name per line"></textarea>
				</div>
				<p class="text-content/50 text-sm mt-1">Headers forwarded from the original request to the auth server.</p>
			</div>

			<div class="field">
				<label for="input-forward_auth_response_headers">Response headers</label>
				<div class="textarea">
					<textarea id="input-forward_auth_response_headers" rows="3"
						bind:value={form.forwardAuth.responseHeaders}
						placeholder="One header name per line"></textarea>
				</div>
				<p class="text-content/50 text-sm mt-1">Headers copied from the auth response onto the upstream request.</p>
			</div>
		{/if}

		<hr>

		<div class="flex gap-3">
			<GuardedButton permission="route.create" type="submit" loading={saving}>Save</GuardedButton>
			<a class="button is-variant-tertiary" href={detailUrl}>Cancel</a>
		</div>
	</form>
</div>
