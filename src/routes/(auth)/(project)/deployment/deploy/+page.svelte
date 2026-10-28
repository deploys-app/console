<script lang="ts">
	import * as format from '$lib/format'
	import { onMount, tick, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import EnvGroupModal from '$lib/components/EnvGroupModal.svelte'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import EnvVarEditor from '$lib/components/EnvVarEditor.svelte'
	import { denyTooltip } from '$lib/permission'
	import { sameProjectRegistryImage } from '$lib/registry-image'
	import type { PageData } from './$types'

	const REGISTRY_PULL_NAME = 'registry-pull'
	const REGISTRY_PULL_DISPLAY = 'Registry Pull'
	const REGISTRY_SERVER = 'https://registry.deploys.app'

	// Editable sidecar shape used by the form. Mirrors Api.SidecarForm but keeps
	// `type` as a plain string so the <Select> two-way binding (value:
	// string | number) type-checks. Carries a config slot per variant so the
	// form can switch between types without losing partial input.
	interface FormSidecar {
		type: string
		cloudSqlProxy: {
			instance: string
			port: number | null
			credentials: string
			autoIamAuthn: boolean
			privateIp: boolean
		}
		alloyDbProxy: {
			instance: string
			port: number | null
			credentials: string
		}
	}

	function newFormSidecar (type = ''): FormSidecar {
		return {
			type,
			cloudSqlProxy: { instance: '', port: null, credentials: '', autoIamAuthn: false, privateIp: false },
			alloyDbProxy: { instance: '', port: null, credentials: '' }
		}
	}

	const { data }: { data: PageData } = $props()

	const locations = $derived(data.locations)
	const quota = $derived(data.projectInfo.quota)

	const project = $derived(data.project)
	const canProvisionRegistryPull = $derived(data.canProvisionRegistryPull)
	const registryPullMissingPermission = $derived(data.registryPullMissingPermission)

	const deployment = untrack(() => data.deployment)

	const permission = $state({
		pullSecrets: true,
		workloadIdentities: true,
		disks: true,
		envGroups: true
	})

	let pullSecrets = $state<Api.PullSecret[]>([])
	let pullSecretListReady = $state(false)
	let creatingRegistryPull = $state(false)
	let registryPullError = $state('')
	// Set when the user clears the field, so a same-project image does not put
	// registry-pull back while the image and location stay on the same side of
	// the match boundary.
	let registryPullPreselectSkipped = false
	let registryPullPreselectScope = ''

	let workloadIdentities = $state<Api.WorkloadIdentity[]>([])

	let disks = $state<Api.Disk[]>([])

	let envGroups = $state<Api.EnvGroupListItem[]>([])

	const form = $state({
		location: deployment?.location || '',
		name: '',
		type: 'WebService',
		image: '',
		pullSecret: '',
		workloadIdentity: '',
		port: 8080,
		protocol: 'http',
		internal: false, // default for WebService
		command: [] as string[],
		args: [] as string[],
		schedule: '',
		disk: {
			name: '',
			mountPath: '',
			subPath: ''
		},
		minReplicas: 1,
		maxReplicas: 1,
		resources: {
			requests: {
				memory: '0'
			},
			limits: {
				cpu: '0'
			}
		},
		env: [] as { k: string, v: string }[],
		envGroups: [] as string[],
		mountData: [] as { k: string, v: string }[],
		sidecars: [] as FormSidecar[],
		ttlValue: 0,
		// unit in seconds; '0' means no auto-delete
		ttlUnit: '0'
	})

	const registryPullSecretExists = $derived(
		!!form.location && pullSecrets.some((p) => p.name === REGISTRY_PULL_NAME && p.location === form.location)
	)
	const showRegistryPullNew = $derived(pullSecretListReady && !registryPullSecretExists)

	// Access (Google-login gate) is kept OUTSIDE `form` on purpose: save() spreads
	// `...form` into the deploy payload, so flat access keys living in `form` would
	// leak as top-level request fields. We assemble a single nested `access` object
	// after the spread instead. nil/false => public.
	let requireGoogleLogin = $state(false)
	let allowedEmails = $state<string[]>([])
	let allowedDomains = $state<string[]>([])

	if (deployment) {
		form.location = deployment.location
		form.name = deployment.name
		form.type = deployment.type
		form.image = deployment.image
		form.pullSecret = deployment.pullSecret
		form.workloadIdentity = deployment.workloadIdentity
		form.port = deployment.port
		form.protocol = deployment.protocol
		form.internal = deployment.internal
		form.command = deployment.command
		form.args = deployment.args
		form.schedule = deployment.schedule
		form.disk = deployment.disk || {
			name: '',
			mountPath: '',
			subPath: ''
		}
		form.minReplicas = deployment.minReplicas
		form.maxReplicas = deployment.maxReplicas
		form.resources = deployment.resources
		form.env = Object.entries(deployment.env || {}).map(([k, v]) => ({ k, v }))
		form.envGroups = [...(deployment.envGroups || [])]
		form.mountData = Object.entries(deployment.mountData || {}).map(([k, v]) => ({ k, v }))
		form.sidecars = (deployment.sidecars || []).map((s): FormSidecar => {
			const sc = newFormSidecar()
			if (s.cloudSqlProxy) {
				sc.type = 'cloudSqlProxy'
				sc.cloudSqlProxy = {
					instance: s.cloudSqlProxy.instance ?? '',
					port: s.cloudSqlProxy.port ?? null,
					credentials: s.cloudSqlProxy.credentials ?? '',
					autoIamAuthn: s.cloudSqlProxy.autoIamAuthn ?? false,
					privateIp: s.cloudSqlProxy.privateIp ?? false
				}
			} else if (s.alloyDbProxy) {
				sc.type = 'alloyDbProxy'
				sc.alloyDbProxy = {
					instance: s.alloyDbProxy.instance ?? '',
					port: s.alloyDbProxy.port ?? null,
					credentials: s.alloyDbProxy.credentials ?? ''
				}
			}
			return sc
		})
		requireGoogleLogin = deployment.access?.requireGoogleLogin ?? false
		allowedEmails = [...(deployment.access?.allowedEmails || [])]
		allowedDomains = [...(deployment.access?.allowedDomains || [])]
		if (deployment.ttl > 0) {
			if (deployment.ttl % 86400 === 0) {
				form.ttlUnit = '86400'
				form.ttlValue = deployment.ttl / 86400
			} else if (deployment.ttl % 3600 === 0) {
				form.ttlUnit = '3600'
				form.ttlValue = deployment.ttl / 3600
			} else {
				form.ttlUnit = '60'
				form.ttlValue = Math.max(1, Math.round(deployment.ttl / 60))
			}
		}
	}

	const selectedLocation = $derived(locations.find((x) => x.id === form.location))

	async function fetchPullSecrets () {
		if (!selectedLocation) {
			pullSecrets = []
			pullSecretListReady = false
			return
		}

		const location = selectedLocation.id
		const resp = await api.invoke<Api.List<Api.PullSecret>>('pullSecret.list', { project, location }, fetch)
		// A list started for a previous location must not replace the current one.
		if (form.location !== location) return
		pullSecretListReady = true
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.pullSecrets = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		let items = resp.result.items ?? []
		// New appends registry-pull locally before this list (started earlier) returns.
		// Keep that option, or the select drops it while the field still points at it.
		const created = pullSecrets.find((p) => p.name === REGISTRY_PULL_NAME && p.location === location)
		if (created && !items.some((p) => p.name === REGISTRY_PULL_NAME)) {
			items = [...items, created]
		}
		pullSecrets = items
		maybePreselectRegistryPull()
	}

	function preselectScopeFor (image: string, location: string) {
		const matched = sameProjectRegistryImage(image, project) ? '1' : '0'
		return `${location}\0${matched}`
	}

	function maybePreselectRegistryPull (image = form.image) {
		if (registryPullPreselectSkipped) return
		if (!permission.pullSecrets) return
		if (!sameProjectRegistryImage(image, project)) return
		if (form.pullSecret !== '') return
		if (!pullSecrets.some((p) => p.name === REGISTRY_PULL_NAME)) return
		form.pullSecret = REGISTRY_PULL_NAME
	}

	function onImageInput (e: Event) {
		const image = e.currentTarget instanceof HTMLInputElement ? e.currentTarget.value : form.image
		const scope = preselectScopeFor(image, form.location)
		if (scope !== registryPullPreselectScope) {
			registryPullPreselectScope = scope
			registryPullPreselectSkipped = false
		}
		maybePreselectRegistryPull(image)
	}

	function onPullSecretChange (value: string | number) {
		if (String(value) !== '') return
		registryPullPreselectSkipped = true
	}

	function alreadyExists (message: string | undefined) {
		return /already exist/i.test(message ?? '')
	}

	function newestKey (keys: Api.ServiceAccountKey[]) {
		return keys.reduce((a, b) => (new Date(b.createdAt) > new Date(a.createdAt) ? b : a))
	}

	async function createRegistryPullSecret () {
		if (creatingRegistryPull) return
		registryPullError = ''
		const location = form.location
		if (!location) return

		creatingRegistryPull = true
		try {
			const existing = pullSecrets.find((p) => p.name === REGISTRY_PULL_NAME && p.location === location)
			if (existing) {
				form.pullSecret = existing.name
				return
			}

			const saResp = await api.invoke('serviceAccount.create', {
				project,
				sid: REGISTRY_PULL_NAME,
				name: REGISTRY_PULL_DISPLAY
			}, fetch)
			if (!saResp.ok && !alreadyExists(saResp.error?.message)) {
				registryPullError = saResp.error?.message ?? 'Failed to create the pull service account.'
				return
			}

			let getResp = await api.invoke<Api.ServiceAccount>('serviceAccount.get', { project, id: REGISTRY_PULL_NAME }, fetch)
			if (!getResp.ok) {
				registryPullError = getResp.error?.message ?? 'Failed to read the pull service account.'
				return
			}
			const email = getResp.result?.email
			if (!email) {
				registryPullError = 'The pull service account has no email.'
				return
			}

			const roleResp = await api.invoke<Api.Role>('role.get', { project, role: REGISTRY_PULL_NAME }, fetch)
			const roleExists = roleResp.ok && roleResp.result?.role === REGISTRY_PULL_NAME
			if (!roleExists) {
				if (!roleResp.ok && !roleResp.error?.notFound) {
					registryPullError = roleResp.error?.message ?? 'Failed to read the registry-pull role.'
					return
				}
				const roleCreate = await api.invoke('role.create', {
					project,
					role: REGISTRY_PULL_NAME,
					name: REGISTRY_PULL_DISPLAY,
					permissions: ['registry.pull']
				}, fetch)
				if (!roleCreate.ok && !alreadyExists(roleCreate.error?.message)) {
					registryPullError = roleCreate.error?.message ?? 'Failed to create the registry-pull role.'
					return
				}
			}

			// role.bind replaces the account's entire role set. Only this
			// dedicated account, and only the registry-pull role.
			const bindResp = await api.invoke('role.bind', { project, email, roles: [REGISTRY_PULL_NAME] }, fetch)
			if (!bindResp.ok) {
				registryPullError = bindResp.error?.message ?? 'Failed to bind the registry-pull role.'
				return
			}

			let keys = getResp.result?.keys ?? []
			if (keys.length === 0) {
				const keyResp = await api.invoke('serviceAccount.createKey', { project, id: REGISTRY_PULL_NAME }, fetch)
				if (!keyResp.ok) {
					registryPullError = keyResp.error?.message ?? 'Failed to create a service account key.'
					return
				}
				getResp = await api.invoke<Api.ServiceAccount>('serviceAccount.get', { project, id: REGISTRY_PULL_NAME }, fetch)
				if (!getResp.ok) {
					registryPullError = getResp.error?.message ?? 'Failed to read the new key.'
					return
				}
				keys = getResp.result?.keys ?? []
			}
			const secret = keys.length > 0 ? newestKey(keys)?.secret : ''
			if (!secret) {
				registryPullError = 'Could not read the service account key secret.'
				return
			}

			const psResp = await api.invoke('pullSecret.create', {
				project,
				location,
				name: REGISTRY_PULL_NAME,
				spec: { server: REGISTRY_SERVER, username: email, password: secret }
			}, fetch)
			if (!psResp.ok && !alreadyExists(psResp.error?.message)) {
				registryPullError = psResp.error?.message ?? 'Failed to create the pull secret.'
				return
			}

			if (!pullSecrets.some((p) => p.name === REGISTRY_PULL_NAME && p.location === location)) {
				pullSecrets = [...pullSecrets, {
					name: REGISTRY_PULL_NAME,
					value: '',
					spec: { server: REGISTRY_SERVER, username: email, password: '' },
					location,
					action: 'create',
					status: 'success',
					createdAt: '',
					createdBy: ''
				}]
			}
			form.pullSecret = REGISTRY_PULL_NAME
		} catch (e) {
			registryPullError = e instanceof Error ? e.message : 'Failed to create the pull secret.'
		} finally {
			creatingRegistryPull = false
		}
	}

	async function fetchWorkloadIdentities () {
		if (!selectedLocation) {
			workloadIdentities = []
			return
		}

		const resp = await api.invoke<Api.List<Api.WorkloadIdentity>>('workloadIdentity.list', { project, location: selectedLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.workloadIdentities = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		workloadIdentities = resp.result.items ?? []
	}

	async function fetchDisks () {
		if (!selectedLocation) {
			disks = []
			return
		}

		const resp = await api.invoke<Api.List<Api.Disk>>('disk.list', { project, location: selectedLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.disks = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		disks = resp.result.items ?? []
	}

	async function fetchEnvGroups () {
		const resp = await api.invoke<Api.List<Api.EnvGroupListItem>>('envGroup.list', { project }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.envGroups = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		envGroups = resp.result.items ?? []
	}

	async function changeLocation () {
		pullSecrets = []
		pullSecretListReady = false
		workloadIdentities = []
		disks = []

		await tick()
		// Reset the clear-latch only when the location (or the image's match
		// bit, if it changed with it) actually changed. A reset after tick must
		// not undo a clear that landed once this scope was already current.
		const scope = preselectScopeFor(form.image, form.location)
		if (scope !== registryPullPreselectScope) {
			registryPullPreselectScope = scope
			registryPullPreselectSkipped = false
		}
		if (!selectedLocation) {
			return
		}
		fetchPullSecrets()
		fetchWorkloadIdentities()
		fetchDisks()
	}

	let envGroupInput = $state('')

	function addEnvGroup (name: string) {
		const n = name.trim()
		if (!n || form.envGroups.includes(n)) return
		form.envGroups = [...form.envGroups, n]
	}

	function addEnvGroupFromInput () {
		addEnvGroup(envGroupInput)
		envGroupInput = ''
	}

	function removeEnvGroup (name: string) {
		form.envGroups = form.envGroups.filter((g) => g !== name)
	}

	const envGroupByName = $derived(new Map(envGroups.map((g) => [g.name, g])))

	let envGroupModal = $state<EnvGroupModal | null>(null)

	// envGroup.list is a non-sensitive index (names + count, no values), so fetch
	// the full group on demand to preview its variables. Reading the values
	// requires envgroup.get — a list-only caller gets a forbidden error here.
	async function viewEnvGroup (name: string) {
		const resp = await api.invoke<Api.EnvGroup>('envGroup.get', { project, name }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		envGroupModal?.open(resp.result)
	}

	function convertSidecars () {
		return form.sidecars
			.filter((s) => s.type)
			.map((s) => {
				if (s.type === 'cloudSqlProxy') {
					return {
						cloudSqlProxy: {
							instance: s.cloudSqlProxy.instance,
							port: s.cloudSqlProxy.port,
							// autoIamAuthn and credentials are mutually exclusive; never
							// send a stale credential when IAM auth is selected.
							credentials: s.cloudSqlProxy.autoIamAuthn ? '' : s.cloudSqlProxy.credentials,
							autoIamAuthn: s.cloudSqlProxy.autoIamAuthn,
							privateIp: s.cloudSqlProxy.privateIp
						}
					}
				}
				if (s.type === 'alloyDbProxy') {
					return {
						alloyDbProxy: {
							instance: s.alloyDbProxy.instance,
							port: s.alloyDbProxy.port,
							credentials: s.alloyDbProxy.credentials
						}
					}
				}
				return {}
			})
	}

	const sidecarMax = 2

	function addSidecar () {
		if (form.sidecars.length >= sidecarMax) {
			return
		}
		form.sidecars = [...form.sidecars, newFormSidecar('cloudSqlProxy')]
	}

	function removeSidecar (i: number) {
		form.sidecars = form.sidecars.filter((_, k) => k !== i)
	}

	let saving = $state(false)

	async function save (e: Event) {
		e.preventDefault()

		if (saving) {
			return
		}

		saving = true
		try {
			const unit = parseInt(form.ttlUnit) || 0
			const ttlSeconds = unit > 0 ? Math.max(0, Math.floor(Number(form.ttlValue) || 0)) * unit : 0
			const resp = await api.invoke('deployment.deploy', {
				project,
				...form,
				protocol: form.type === 'WebService' ? form.protocol : '',
				env: form.env.reduce<Record<string, string>>((p, x) => { p[x.k] = x.v; return p }, {}),
				mountData: form.mountData.reduce<Record<string, string>>((p, x) => { p[x.k] = x.v; return p }, {}),
				sidecars: convertSidecars(),
				ttl: ttlSeconds,
				// Set after the spread so it can never be clobbered by `...form`.
				// Toggle OFF => null (public); the server lowercases/dedupes/validates.
				access: requireGoogleLogin
					? {
						requireGoogleLogin: true,
						allowedEmails: allowedEmails.map((s) => s.trim()).filter(Boolean),
						allowedDomains: allowedDomains.map((s) => s.trim()).filter(Boolean)
					}
					: null
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/deployment/detail?project=${project}&location=${form.location}&name=${form.name}`)
		} finally {
			saving = false
		}
	}

	onMount(() => {
		changeLocation()
		fetchEnvGroups()
	})
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/deployment?project=${project}`} class="link"><h6>Deployments</h6></a>
	</div>
	{#if deployment}
		<div class="breadcrumb-item">
			<a href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`} class="link">
				<h6>{deployment.name}</h6>
			</a>
		</div>
	{/if}
	<div class="breadcrumb-item">
		<h6>Deploy</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{#if deployment}Deploy new revision{:else}Create deployment{/if}</strong></h4>
		<p class="page-sub">Configure and roll out a container workload.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="form-section is-first">
			<h6 class="form-section-title">General</h6>
		</div>
		{#if deployment}
			<div class="field">
				<label for="input-location-readonly">Location</label>
				<div class="input">
					<input id="input-location-readonly" value={deployment.location} readonly>
				</div>
			</div>
		{:else}
			<div class="field">
				<label for="input-location">Location</label>
				<Select
					id="input-location"
					bind:value={form.location}
					onchange={changeLocation}
					required
					placeholder="Select Location"
					options={locations.map((it) => ({ value: it.id, label: it.id }))} />
			</div>
		{/if}

		{#if selectedLocation}
			<div class="field">
				<label for="input-name">Name</label>
				<div class="input">
					<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!deployment}>
				</div>
			</div>

			{#if deployment}
				<div class="field">
					<label for="input-type-readonly">Type</label>
					<div class="input">
						<input id="input-type-readonly" value={format.deploymentType(deployment.type)} readonly>
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="input-type">Type</label>
					<Select
						id="input-type"
						bind:value={form.type}
						options={[
							{ value: 'WebService', label: 'Web Service' },
							{ value: 'InternalTCPService', label: 'Internal TCP Service' },
							{ value: 'Worker', label: 'Worker' },
							{ value: 'CronJob', label: 'CronJob' }
						]} />
				</div>
			{/if}

		<div class="field">
			<label for="input-image">Image</label>
			<div class="input">
				<input id="input-image" placeholder="image" bind:value={form.image} oninput={onImageInput}>
			</div>
		</div>

		<div class="field">
			<label for={permission.pullSecrets ? 'input-pull_secret' : 'input-pull_secret-text'}>Pull Secret</label>
			<div class="flex items-center gap-2">
				<div class="flex-1">
					{#if permission.pullSecrets}
						{#key pullSecrets}
							<Select
								id="input-pull_secret"
								bind:value={form.pullSecret}
								onchange={onPullSecretChange}
								options={[{ value: '', label: 'No Pull Secret' }, ...pullSecrets.map((it) => ({ value: it.name, label: it.name }))]} />
						{/key}
					{:else}
						<div class="input">
							<input id="input-pull_secret-text" placeholder="Pull Secret Name" bind:value={form.pullSecret}>
						</div>
					{/if}
				</div>
				{#if showRegistryPullNew}
					{#if canProvisionRegistryPull}
						<button
							class="button is-variant-secondary"
							class:is-loading={creatingRegistryPull}
							disabled={creatingRegistryPull}
							onclick={createRegistryPullSecret}
							title="Create a registry-pull service account and pull secret in this location"
							type="button">
							<i class="fa-solid fa-plus mr-2"></i>
							New
						</button>
					{:else}
						<span class="inline-flex" title={denyTooltip(registryPullMissingPermission)}>
							<button class="button is-variant-secondary" type="button" disabled aria-disabled="true">
								<i class="fa-solid fa-plus mr-2"></i>
								New
							</button>
						</span>
					{/if}
				{/if}
			</div>
			{#if registryPullError}
				<p class="text-negative text-sm mt-1">{registryPullError}</p>
			{/if}
			{#if showRegistryPullNew}
				<span class="helper">For a private registry. New creates a registry-pull service account (registry.pull only) and a pull secret for registry.deploys.app in this location.</span>
			{/if}
			{#if !permission.pullSecrets}
				<p class="text-xs">* You don't have permission to list pull secrets</p>
			{/if}
		</div>

		{#if selectedLocation?.features.workloadIdentity}
			{#if permission.workloadIdentities}
				<div class="field">
					<label for="input-workload_identity">Workload Identity</label>
					{#key workloadIdentities}
						<Select
							id="input-workload_identity"
							bind:value={form.workloadIdentity}
							options={[{ value: '', label: 'No Workload Identity' }, ...workloadIdentities.map((it) => ({ value: it.name, label: it.name }))]} />
					{/key}
				</div>
			{:else}
				<div class="field">
					<label for="input-workload_identity-text">Workload Identity</label>
					<div class="input">
						<input id="input-workload_identity-text" placeholder="Workload Identity Name" bind:value={form.workloadIdentity}>
					</div>
					<p class="text-xs">* You don't have permission to list workload identities</p>
				</div>
			{/if}
		{/if}

		{#if ['WebService', 'TCPService', 'InternalTCPService'].includes(form.type)}
			<div class="field">
				<label for="input-port">Port</label>
				<div class="input">
					<input class="-no-arrow" id="input-port" placeholder="8080" type="number" bind:value={form.port}>
				</div>
			</div>
		{/if}

		{#if form.type === 'WebService'}
			<div class="field">
				<label for="input-protocol">Protocol</label>
				<Select
					id="input-protocol"
					bind:value={form.protocol}
					options={[
						{ value: 'http', label: 'http' },
						{ value: 'https', label: 'https' },
						{ value: 'h2c', label: 'h2c' }
					]} />
			</div>
			<div class="field">
				<div class="checkbox">
					<input id="input-internal" type="checkbox" bind:checked={form.internal}>
					<label for="input-internal">Internal Service</label>
				</div>
			</div>
		{/if}

		<div class="field">
			<label for="div-command">Command</label>
			<div id="div-command" class="pb-2">
				{#each form.command as _, i (i)}
					<div class="input -has-icon-right mb-2">
						<input bind:value={form.command[i]}>
						<button class="icon-button icon -is-right" type="button" aria-label="Remove"
							onclick={() => { form.command = form.command.filter((_, k) => k !== i) }}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
				{/each}
			</div>
			<button class="button is-variant-secondary m-auto" type="button" onclick={() => { form.command = [...form.command, ''] }}>
				<i class="fa-solid fa-plus mr-3"></i>
				<span>Add Command</span>
			</button>
		</div>

		<div class="field">
			<label for="div-args">Args</label>
			<div id="div-args" class="pb-2">
				{#each form.args as _, i (i)}
					<div class="input -has-icon-right mb-2">
						<input bind:value={form.args[i]}>
						<button class="icon-button icon -is-right" type="button" aria-label="Remove an argument"
							onclick={() => { form.args = form.args.filter((_, k) => k !== i) }}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
				{/each}
			</div>
			<button class="button is-variant-secondary m-auto" type="button"
					onclick={() => { form.args = [...form.args, ''] }}>
				<i class="fa-solid fa-plus mr-3"></i>
				<span>Add Arg</span>
			</button>
		</div>

		{#if form.type === 'CronJob'}
			<div class="field">
				<label for="input-schedule">Schedule</label>
				<div class="input">
					<input id="input-schedule" placeholder="*/5 * * * *" bind:value={form.schedule}>
				</div>
			</div>
		{/if}

		{#if selectedLocation.features.disk}
			<div class="grid gap-4">
				<div class="form-section">
					<h6 class="form-section-title">Disk</h6>
					<span class="form-section-hint">Attach a persistent disk and mount it into the container.</span>
				</div>

				{#if permission.disks}
					<div class="field">
						<label for="input-disk_name">Name</label>
						{#key disks}
							<Select
								id="input-disk_name"
								bind:value={form.disk.name}
								options={[{ value: '', label: 'No Disk' }, ...disks.map((it) => ({ value: it.name, label: it.name }))]} />
						{/key}
					</div>
				{:else}
					<div class="field">
						<label for="input-disk_name-text">Name</label>
						<div class="input">
							<input id="input-disk_name-text" placeholder="Disk Name" bind:value={form.disk.name}>
						</div>
						<p class="text-xs">* You don't have permission to list disks</p>
					</div>
				{/if}

				{#if form.disk.name}
					<div class="field">
						<label for="input-disk_mount_path">Mount Path</label>
						<div class="input">
							<input id="input-disk_mount_path" placeholder="" bind:value={form.disk.mountPath}>
						</div>
					</div>
					<div class="field">
						<label for="input-disk_sub_path">Sub Path</label>
						<div class="input">
							<input id="input-disk_sub_path" placeholder="" bind:value={form.disk.subPath}>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="form-section">
			<h6 class="form-section-title">Auto-delete (TTL)</h6>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div class="field">
				<label for="input-ttl_unit">Unit</label>
				<Select
					id="input-ttl_unit"
					bind:value={form.ttlUnit}
					options={[
						{ value: '0', label: 'No auto-delete' },
						{ value: '60', label: 'Minutes' },
						{ value: '3600', label: 'Hours' },
						{ value: '86400', label: 'Days' }
					]} />
			</div>

			{#if form.ttlUnit !== '0'}
				<div class="field">
					<label for="input-ttl_value">Duration</label>
					<div class="input">
						<input id="input-ttl_value" type="number" min="1" bind:value={form.ttlValue}>
					</div>
				</div>
			{/if}
		</div>
		<small class="helper">
			Deployment will be automatically deleted after this duration. Routes cannot be set on auto-delete deployments.
		</small>

		{#if ['WebService', 'Worker', 'InternalTCPService'].includes(form.type)}
			<div>
				<div class="grid gap-4">
					<div class="form-section">
						<h6 class="form-section-title">Autoscaling</h6>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="field">
							<label for="input-min_replicas">Min Replicas</label>
							<div class="input">
								<input id="input-min_replicas"
									bind:value={form.minReplicas}
									type="number"
									min="1"
									max={quota.deploymentMaxReplicas}>
							</div>
						</div>

						<div class="field">
							<label for="input-max_replicas">Max Replicas</label>
							<div class="input">
								<input id="input-max_replicas"
									bind:value={form.maxReplicas}
									type="number"
									min="1"
									max={quota.deploymentMaxReplicas}>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="form-section">
			<h6 class="form-section-title">Resources</h6>
			<span class="form-section-hint">CPU and memory allocated to each container instance.</span>
		</div>

<!--        <div class="field">-->
<!--            <label for="input-cpu">CPU allocated</label>-->
<!--            <div class="select">-->
<!--                <select id="input-cpu" name="cpu">-->
<!--                    {{range .Location.CPUAllocatable}}-->
<!--                    <option value="{{.}}" {{if eq . $.Form.CPU}}selected{{end}}>{{. | textDeploymentCPU}}</option>-->
<!--                    {{end}}-->
<!--                </select>-->
<!--            </div>-->
<!--            <small class="helper">-->
<!--                Number of vCPUs allocated to each container instance.-->
<!--            </small>-->
<!--        </div>-->

		<div class="field">
			<label for="input-cpu-limit">CPU limited</label>
			<Select
				id="input-cpu-limit"
				name="cpu"
				bind:value={form.resources.limits.cpu}
				options={[
					{ value: '0', label: 'Cluster Default' },
					{ value: '1', label: '1' },
					{ value: '2', label: '2' },
					{ value: '4', label: '4' }
				]} />
			<small class="helper">
				Number of vCPUs limited to each container instance. Autoscaling triggers when CPU usage reaches 80% of the limit.
			</small>
		</div>

		<div class="field">
			<label for="input-memory">Memory allocated</label>
			<Select
				id="input-memory"
				bind:value={form.resources.requests.memory}
				options={selectedLocation.memoryAllocatable.map((it) => ({ value: it, label: format.memory(it) }))} />
			<small class="helper">
				Memory to allocate to each container instance.
			</small>
		</div>

		<div class="form-section">
			<h6 class="form-section-title">Env Groups</h6>
			<span class="form-section-hint">
				Project-scoped sets of environment variables merged into the deployment.
				Variables defined below take precedence over env groups.
			</span>
		</div>
		{#if permission.envGroups}
			<div class="field flex">
				{#key envGroups}
					<Select
						placeholder="Select Env Group"
						resetOnSelect
						onchange={(v) => addEnvGroup(String(v))}
						options={envGroups.filter((g) => !form.envGroups.includes(g.name)).map((it) => ({ value: it.name, label: it.name }))} />
				{/key}
			</div>
		{:else}
			<div class="field flex gap-3">
				<div class="input flex-1">
					<input placeholder="Env Group Name" bind:value={envGroupInput}>
				</div>
				<button class="button is-variant-secondary" type="button" onclick={addEnvGroupFromInput}>Add</button>
			</div>
			<p class="text-xs">* You don't have permission to list env groups</p>
		{/if}
		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Name</th>
						<th class="is-collapse is-align-right"></th>
					</tr>
				</thead>
				<tbody>
					{#each form.envGroups as name (name)}
						<tr>
							<td>{name}</td>
							<td>
								<div class="flex gap-2 justify-end">
									{#if envGroupByName.has(name)}
										<button class="icon-button" type="button" aria-label="View env group"
											onclick={() => viewEnvGroup(name)}>
											<i class="fa-solid fa-eye"></i>
										</button>
									{/if}
									<button class="icon-button" type="button" aria-label="Remove env group"
										onclick={() => removeEnvGroup(name)}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="2" class="capitalize text-content/50">No env groups</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="form-section">
			<h6 class="form-section-title">Environment Variables</h6>
		</div>
		<EnvVarEditor bind:entries={form.env} />

		<div class="form-section">
			<h6 class="form-section-title">Mount Data</h6>
		</div>
		<div>
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Path</th>
							<th class="is-collapse p-0"></th>
							<th>Data</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.mountData as it, i (i)}
							<tr>
								<td>
									<div class="input">
										<input bind:value={it.k} placeholder="Path">
									</div>
								</td>
								<td class="p-0 pl-3">:</td>
								<td class="pl-3">
									<div class="textarea">
										<textarea bind:value={it.v} placeholder="Data"></textarea>
									</div>
								</td>
								<td style="padding: 19px 12px;">
									<button class="icon-button" type="button" aria-label="Remove a mount data"
										onclick={() => { form.mountData = form.mountData.filter((_, k) => k !== i) }}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
					<tr>
						<td colspan="4">
							<button class="button is-variant-secondary flex m-auto" type="button"
								onclick={() => { form.mountData = [...form.mountData, { k: '', v: '' }] }}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add Data</span>
							</button>
						</td>
					</tr>
					</tfoot>
				</table>
			</div>
		</div>

		<div class="form-section">
			<h6 class="form-section-title">Sidecars</h6>
		</div>
		<div class="grid gap-4">
			{#each form.sidecars as sidecar, i (i)}
				<div class="panel is-level-200 grid gap-3">
					<div class="flex justify-between items-center">
						<strong>Sidecar #{i + 1}</strong>
						<button class="icon-button" type="button" aria-label="Remove sidecar"
							onclick={() => removeSidecar(i)}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
					<div class="field">
						<label for="input-sidecar-type-{i}">Type</label>
						<Select
							id="input-sidecar-type-{i}"
							bind:value={sidecar.type}
							placeholder="Select Type"
							options={[
								{ value: 'cloudSqlProxy', label: 'Cloud SQL Proxy' },
								{ value: 'alloyDbProxy', label: 'AlloyDB Proxy' }
							]} />
					</div>
					{#if sidecar.type === 'cloudSqlProxy'}
						<div class="field">
							<label for="input-sidecar-instance-{i}">Instance</label>
							<div class="input">
								<input id="input-sidecar-instance-{i}" placeholder="project:region:instance" bind:value={sidecar.cloudSqlProxy.instance} required>
							</div>
						</div>
						<div class="field">
							<label for="input-sidecar-port-{i}">Port</label>
							<div class="input">
								<input class="-no-arrow" id="input-sidecar-port-{i}" placeholder="3300" type="number" bind:value={sidecar.cloudSqlProxy.port}>
							</div>
						</div>
						<div class="field">
							<div class="checkbox">
								<input id="input-sidecar-private-ip-{i}" type="checkbox" bind:checked={sidecar.cloudSqlProxy.privateIp}>
								<label for="input-sidecar-private-ip-{i}">Private IP</label>
							</div>
						</div>
						<div class="field">
							<div class="checkbox">
								<input id="input-sidecar-auto-iam-{i}" type="checkbox" bind:checked={sidecar.cloudSqlProxy.autoIamAuthn}>
								<label for="input-sidecar-auto-iam-{i}">Automatic IAM authentication</label>
							</div>
						</div>
						{#if sidecar.cloudSqlProxy.autoIamAuthn}
							<p class="text-content/60 text-sm">
								Uses the deployment's IAM identity to connect — bind a workload identity and leave credentials empty.
							</p>
						{:else}
							<div class="field">
								<label for="input-sidecar-credentials-{i}">Credentials</label>
								<div class="input">
									<input id="input-sidecar-credentials-{i}" placeholder="Credentials JSON" bind:value={sidecar.cloudSqlProxy.credentials}>
								</div>
							</div>
						{/if}
					{:else if sidecar.type === 'alloyDbProxy'}
						<div class="field">
							<label for="input-sidecar-alloydb-instance-{i}">Instance</label>
							<div class="input">
								<input id="input-sidecar-alloydb-instance-{i}" placeholder="projects/p/locations/l/clusters/c/instances/i" bind:value={sidecar.alloyDbProxy.instance} required>
							</div>
						</div>
						<div class="field">
							<label for="input-sidecar-alloydb-port-{i}">Port</label>
							<div class="input">
								<input class="-no-arrow" id="input-sidecar-alloydb-port-{i}" placeholder="5432" type="number" bind:value={sidecar.alloyDbProxy.port}>
							</div>
						</div>
						<div class="field">
							<label for="input-sidecar-alloydb-credentials-{i}">Credentials</label>
							<div class="input">
								<input id="input-sidecar-alloydb-credentials-{i}" placeholder="Credentials JSON" bind:value={sidecar.alloyDbProxy.credentials}>
							</div>
						</div>
					{/if}
				</div>
			{/each}
			{#if form.sidecars.length < sidecarMax}
				<button class="button is-variant-secondary flex m-auto" type="button" onclick={addSidecar}>
					<i class="fa-solid fa-plus mr-3"></i>
					<span>Add Sidecar</span>
				</button>
			{/if}
		</div>

		{#if ['WebService', 'Static'].includes(form.type)}
			<div class="form-section">
				<h6 class="form-section-title inline-flex items-center gap-2">
					Access
					<span class="preview-badge">Preview</span>
				</h6>
				<span class="form-section-hint">Restrict who can reach this deployment over the web.</span>
			</div>
			<div class="field">
				<div class="checkbox">
					<input id="input-require_google_login" type="checkbox" bind:checked={requireGoogleLogin}>
					<label for="input-require_google_login">Require Google login</label>
				</div>
				<small class="helper">Programmatic/API clients cannot bypass this.</small>
				{#if requireGoogleLogin && allowedEmails.length === 0 && allowedDomains.length === 0}
					<small class="helper">Any signed-in Google account can access — add emails or domains to restrict.</small>
				{/if}
				{#if requireGoogleLogin && form.type === 'Static'}
					<small class="helper">Enabling login forfeits edge caching for this site.</small>
				{/if}
			</div>

			{#if requireGoogleLogin}
				<div class="field">
					<label for="div-allowed_emails">Allowed Emails</label>
					<div id="div-allowed_emails" class="pb-2">
						{#each allowedEmails as _, i (i)}
							<div class="input -has-icon-right mb-2">
								<input bind:value={allowedEmails[i]} placeholder="user@example.com">
								<button class="icon-button icon -is-right" type="button" aria-label="Remove an allowed email"
									onclick={() => { allowedEmails = allowedEmails.filter((_, k) => k !== i) }}>
									<i class="fa-solid fa-trash-alt"></i>
								</button>
							</div>
						{/each}
					</div>
					<button class="button is-variant-secondary m-auto" type="button"
							onclick={() => { allowedEmails = [...allowedEmails, ''] }}>
						<i class="fa-solid fa-plus mr-3"></i>
						<span>Add Email</span>
					</button>
				</div>

				<div class="field">
					<label for="div-allowed_domains">Allowed Domains</label>
					<div id="div-allowed_domains" class="pb-2">
						{#each allowedDomains as _, i (i)}
							<div class="input -has-icon-right mb-2">
								<input bind:value={allowedDomains[i]} placeholder="example.com">
								<button class="icon-button icon -is-right" type="button" aria-label="Remove an allowed domain"
									onclick={() => { allowedDomains = allowedDomains.filter((_, k) => k !== i) }}>
									<i class="fa-solid fa-trash-alt"></i>
								</button>
							</div>
						{/each}
					</div>
					<button class="button is-variant-secondary m-auto" type="button"
							onclick={() => { allowedDomains = [...allowedDomains, ''] }}>
						<i class="fa-solid fa-plus mr-3"></i>
						<span>Add Domain</span>
					</button>
				</div>
			{/if}
		{/if}

		<hr>

		<GuardedButton permission="deployment.deploy" type="submit" class="button mt-4 mr-auto" loading={saving}>
			Deploy
		</GuardedButton>
	{/if}
	</form>
</div>

<EnvGroupModal bind:this={envGroupModal} />
