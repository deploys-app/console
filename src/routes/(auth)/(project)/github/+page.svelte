<script>
	import { onMount, untrack } from 'svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip } from '$lib/permission'
	import * as format from '$lib/format'
	import { setupCopy } from '$lib/clipboard'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)
	const envGroups = $derived(data.envGroups)
	const canProvisionPullSecret = $derived(data.canProvisionPullSecret)
	const error = $derived(data.error)

	let links = $state(untrack(() => data.links))
	// Mutable so a freshly-provisioned pull secret is selectable without a reload.
	let pullSecrets = $state(untrack(() => data.pullSecrets))

	const locationOptions = $derived(locations.map((l) => ({ value: l.id, label: l.id })))

	async function reloadLinks () {
		const resp = await api.invoke('github.list', { project }, fetch)
		if (resp.ok) links = resp.result?.items ?? []
	}

	/** @param {Api.GithubLink} it */
	function unlink (it) {
		modal.confirm({
			title: `Unlink ${it.repository}? Workflows from this repository will no longer be able to deploy. Existing deployments are not affected.`,
			yes: 'Unlink',
			async callback () {
				const resp = await api.invoke('github.unlink', {
					project,
					repositoryId: it.repositoryId
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await reloadLinks()
			}
		})
	}

	// workflow generator
	const gen = $state(untrack(() => ({
		repository: data.links[0]?.repository ?? '',
		location: data.locations[0]?.id ?? '',
		name: 'web',
		// 'dockerfile' (default) emits today's container workflow; 'static' emits
		// a bucket-native static-web workflow (mode: static).
		buildType: 'dockerfile',
		port: 8080,
		// static fields — only used when buildType === 'static'
		framework: 'auto',
		buildCommand: '',
		outputDir: 'public',
		spa: false,
		notFound: '404.html',
		// shared config
		workingDirectory: '',
		env: '',
		/** @type {string[]} */
		envGroups: [],
		// container-only
		pullSecret: ''
	})))
	const genRepoOptions = $derived(links.map((l) => ({ value: l.repository, label: l.repository })))
	const genBranch = $derived(links.find((l) => l.repository === gen.repository)?.productionBranch || 'main')

	const buildTypeOptions = [
		{ value: 'dockerfile', label: 'Dockerfile' },
		{ value: 'static', label: 'Static' }
	]
	const frameworkOptions = [
		{ value: 'auto', label: 'Auto-detect' },
		{ value: 'hugo', label: 'Hugo' },
		{ value: 'node', label: 'Node' }
	]

	// --- env groups (multi-select) ---
	const envGroupOptions = $derived(
		envGroups
			.filter((g) => !gen.envGroups.includes(g.name))
			.map((g) => ({ value: g.name, label: g.name }))
	)

	/** @param {string} name */
	function addEnvGroup (name) {
		const n = name.trim()
		if (!n || gen.envGroups.includes(n)) return
		gen.envGroups = [...gen.envGroups, n]
	}

	/** @param {string} name */
	function removeEnvGroup (name) {
		gen.envGroups = gen.envGroups.filter((g) => g !== name)
	}

	// --- pull secret (container deploys only) ---
	const locationPullSecrets = $derived(pullSecrets.filter((p) => p.location === gen.location))
	const pullSecretOptions = $derived([
		{ value: '', label: 'No pull secret' },
		...locationPullSecrets.map((p) => ({ value: p.name, label: p.name }))
	])

	// Drop a selection that doesn't exist in the chosen location (e.g. after
	// switching location). Setting it to '' once is stable — the guard then fails.
	$effect(() => {
		if (gen.pullSecret && !locationPullSecrets.some((p) => p.name === gen.pullSecret)) {
			gen.pullSecret = ''
		}
	})

	const PULL_SA_SID = 'github-pull'
	const PULL_SA_NAME = 'GitHub Pull'
	const PULL_ROLE = 'github-pull'
	const PULL_SECRET_NAME = 'github-pull'
	const REGISTRY_SERVER = 'https://registry.deploys.app'

	let creatingPullSecret = $state(false)
	let pullSecretError = $state('')

	// Provision a dedicated pull-only service account (registry.pull), mint a
	// key, and create a pull secret for it in the selected location — then select
	// it in the generator. Idempotent: reuses an existing github-pull secret,
	// service account, role, or key rather than duplicating them.
	async function createPullSecret () {
		if (creatingPullSecret) return
		const location = gen.location
		if (!location) {
			pullSecretError = 'Select a location first.'
			return
		}

		creatingPullSecret = true
		pullSecretError = ''
		try {
			// Already provisioned in this location? Just select it.
			const existing = pullSecrets.find((p) => p.name === PULL_SECRET_NAME && p.location === location)
			if (existing) {
				gen.pullSecret = existing.name
				return
			}

			// 1. Dedicated pull-only service account (tolerate an existing one).
			const saResp = await api.invoke('serviceAccount.create', { project, sid: PULL_SA_SID, name: PULL_SA_NAME }, fetch)
			if (!saResp.ok && !/already exist/i.test(saResp.error?.message ?? '')) {
				pullSecretError = saResp.error?.message ?? 'Failed to create the pull service account.'
				return
			}

			// 2. Resolve the SA email + existing keys.
			let getResp = await api.invoke('serviceAccount.get', { project, id: PULL_SA_SID }, fetch)
			if (!getResp.ok) {
				pullSecretError = getResp.error?.message ?? 'Failed to read the pull service account.'
				return
			}
			const email = getResp.result?.email
			if (!email) {
				pullSecretError = 'The pull service account has no email.'
				return
			}

			// 3. Ensure the github-pull role (registry.pull) exists, then bind it.
			const roleResp = await api.invoke('role.get', { project, role: PULL_ROLE }, fetch)
			if (!roleResp.ok && roleResp.error?.notFound) {
				const roleCreate = await api.invoke('role.create', {
					project,
					role: PULL_ROLE,
					name: PULL_SA_NAME,
					permissions: ['registry.pull']
				}, fetch)
				if (!roleCreate.ok && !/already exist/i.test(roleCreate.error?.message ?? '')) {
					pullSecretError = roleCreate.error?.message ?? 'Failed to create the github-pull role.'
					return
				}
			}
			const bindResp = await api.invoke('role.bind', { project, email, roles: [PULL_ROLE] }, fetch)
			if (!bindResp.ok) {
				pullSecretError = bindResp.error?.message ?? 'Failed to bind the github-pull role.'
				return
			}

			// 4. Reuse a key if the SA already has one; otherwise mint one and
			//    re-read (createKey returns no secret).
			let keys = getResp.result?.keys ?? []
			if (keys.length === 0) {
				const keyResp = await api.invoke('serviceAccount.createKey', { project, id: PULL_SA_SID }, fetch)
				if (!keyResp.ok) {
					pullSecretError = keyResp.error?.message ?? 'Failed to create a service account key.'
					return
				}
				getResp = await api.invoke('serviceAccount.get', { project, id: PULL_SA_SID }, fetch)
				if (!getResp.ok) {
					pullSecretError = getResp.error?.message ?? 'Failed to read the new key.'
					return
				}
				keys = getResp.result?.keys ?? []
			}
			// Newest key by createdAt.
			const newest = keys.reduce((a, b) => (new Date(b.createdAt) > new Date(a.createdAt) ? b : a), keys[0])
			const secret = newest?.secret
			if (!secret) {
				pullSecretError = 'Could not read the service account key secret.'
				return
			}

			// 5. Create the pull secret in the selected location.
			const psResp = await api.invoke('pullSecret.create', {
				project,
				location,
				name: PULL_SECRET_NAME,
				spec: { server: REGISTRY_SERVER, username: email, password: secret }
			}, fetch)
			if (!psResp.ok && !/already exist/i.test(psResp.error?.message ?? '')) {
				pullSecretError = psResp.error?.message ?? 'Failed to create the pull secret.'
				return
			}

			// 6. Reflect it locally + select it.
			if (!pullSecrets.some((p) => p.name === PULL_SECRET_NAME && p.location === location)) {
				pullSecrets = [...pullSecrets, { name: PULL_SECRET_NAME, location }]
			}
			gen.pullSecret = PULL_SECRET_NAME
		} catch (e) {
			pullSecretError = e instanceof Error ? e.message : 'Failed to create the pull secret.'
		} finally {
			creatingPullSecret = false
		}
	}

	// --- workflow YAML ---
	const permissionsBlock = $derived(gen.buildType === 'static'
		? `permissions:
  id-token: write   # required — this is the credential
  contents: read
  pull-requests: write   # sticky PR preview comment`
		: `permissions:
  id-token: write   # required — this is the credential
  contents: read`)

	// Build the action's `with:` block, emitting only the keys the user set so
	// the generated workflow stays minimal.
	function withBlock () {
		const out = []
		out.push(`        project: ${project}`)
		out.push(`        location: ${gen.location}`)
		out.push(`        name: ${gen.name || 'web'}`)

		if (gen.buildType === 'static') {
			out.push('        mode: static')
			out.push(`        framework: ${gen.framework || 'auto'}`)
			if (gen.buildCommand.trim()) out.push(`        buildCommand: ${gen.buildCommand.trim()}`)
			out.push(`        outputDir: ${gen.outputDir || 'public'}`)
			out.push(`        spa: ${gen.spa ? 'true' : 'false'}`)
			out.push(`        notFound: ${gen.notFound || '404.html'}`)
		} else {
			out.push(`        port: ${Number(gen.port) || 8080}`)
		}

		const wd = gen.workingDirectory.trim()
		if (wd && wd !== '.') out.push(`        workingDirectory: ${wd}`)

		const envLines = gen.env.split('\n').map((l) => l.trim()).filter(Boolean)
		if (envLines.length) {
			out.push('        env: |')
			for (const l of envLines) out.push(`          ${l}`)
		}

		if (gen.envGroups.length) out.push(`        envGroups: ${gen.envGroups.join(',')}`)

		// Pull secret only applies to container deploys — static has no pod.
		if (gen.buildType === 'dockerfile' && gen.pullSecret) {
			out.push(`        pullSecret: ${gen.pullSecret}`)
		}

		return out.join('\n')
	}

	const workflowYaml = $derived(`name: Deploy
on:
  push:
    branches: [${genBranch}]
  pull_request:

${permissionsBlock}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: deploys-app/build-deploy-action@v1
      with:
${withBlock()}
`)

	const createOnGitHubURL = $derived(gen.repository
		? `https://github.com/${gen.repository}/new/main?filename=.github/workflows/deploy.yml&value=${encodeURIComponent(workflowYaml)}`
		: '')

	onMount(() => setupCopy('.copy-workflow'))
</script>

<div class="page-head">
	<div>
		<h4><strong>GitHub</strong></h4>
		<p class="page-sub">Build and deploy linked repositories with GitHub Actions — keyless, with pull request previews</p>
	</div>
	<div>
		<GuardedButton permission="github.link" href={`/github/link?project=${project}`}>
			<i class="fa-solid fa-link mr-2"></i>
			Link repository
		</GuardedButton>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div>
		<h6><strong>Linked repositories</strong></h6>
		<p class="text-content/50 text-sm mt-1">
			Workflows in a linked repository can deploy to this project as the
			linked service account — authenticated by GitHub OIDC, no stored secrets.
		</p>
	</div>

	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Repository</th>
				<th>Service Account</th>
				<th>Branch</th>
				<th>Linked</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each links as it (it.repositoryId)}
					<tr>
						<td>
							<a class="link cell-name" href={`https://github.com/${it.repository}`} target="_blank" rel="noreferrer">
								<i class="fa-brands fa-github mr-1"></i>{it.repository}
							</a>
						</td>
						<td><span class="cell-muted font-mono text-sm">{it.serviceAccountEmail}</span></td>
						<td>
							{#if it.productionBranch}
								<span class="cell-muted font-mono text-sm">{it.productionBranch}</span>
							{:else}
								<span class="cell-muted" title="Any branch can deploy">—</span>
							{/if}
						</td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							<GuardedButton permission="github.unlink" class="icon-button" type="button" aria-label="Unlink repository" onclick={() => unlink(it)}>
								<i class="fa-solid fa-link-slash"></i>
							</GuardedButton>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={links} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>

{#if links.length > 0}
	<br>
	<div class="panel is-level-300 grid gap-6">
		<div>
			<h6><strong>Workflow</strong></h6>
			<p class="text-content/50 text-sm mt-1">
				Add this file as <span class="font-mono">.github/workflows/deploy.yml</span>
				to deploy on push and get pull request previews.
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div class="field">
				<label for="gen-repository">Repository</label>
				<Select id="gen-repository" bind:value={gen.repository} options={genRepoOptions} />
			</div>
			<div class="field">
				<label for="gen-location">Location</label>
				<Select id="gen-location" bind:value={gen.location} options={locationOptions} />
			</div>
			<div class="field">
				<label for="gen-name">Deployment name</label>
				<div class="input">
					<input id="gen-name" class="font-mono" bind:value={gen.name} placeholder="web">
				</div>
			</div>
			<div class="field">
				<label for="gen-build-type">Build type</label>
				<Select id="gen-build-type" bind:value={gen.buildType} options={buildTypeOptions} />
			</div>
			{#if gen.buildType === 'dockerfile'}
				<div class="field">
					<label for="gen-port">Port</label>
					<div class="input">
						<input id="gen-port" type="number" min="1" bind:value={gen.port} placeholder="8080">
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="gen-framework">Framework</label>
					<Select id="gen-framework" bind:value={gen.framework} options={frameworkOptions} />
				</div>
				<div class="field">
					<label for="gen-build-command">Build command</label>
					<div class="input">
						<input id="gen-build-command" class="font-mono" bind:value={gen.buildCommand} placeholder="preset (e.g. hugo --minify)">
					</div>
				</div>
				<div class="field">
					<label for="gen-output-dir">Output directory</label>
					<div class="input">
						<input id="gen-output-dir" class="font-mono" bind:value={gen.outputDir} placeholder="public">
					</div>
				</div>
				<div class="field">
					<label for="gen-not-found">404 document</label>
					<div class="input">
						<input id="gen-not-found" class="font-mono" bind:value={gen.notFound} placeholder="404.html">
					</div>
				</div>
				<div class="field self-end">
					<div class="checkbox">
						<input id="gen-spa" type="checkbox" bind:checked={gen.spa}>
						<label for="gen-spa">SPA fallback to index.html</label>
					</div>
				</div>
			{/if}
			<div class="field">
				<label for="gen-working-directory">Root folder</label>
				<div class="input">
					<input id="gen-working-directory" class="font-mono" bind:value={gen.workingDirectory} placeholder=". (monorepo: apps/web)">
				</div>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="field">
				<label for="gen-env">Environment variables</label>
				<div class="textarea">
					<textarea id="gen-env" class="font-mono" rows="4" bind:value={gen.env} placeholder="KEY=value&#10;ANOTHER=thing"></textarea>
				</div>
				<p class="text-content/50 text-sm mt-1">One <span class="font-mono">KEY=VALUE</span> per line.</p>
			</div>

			<div class="field">
				<label for="gen-env-group">Env groups</label>
				{#key gen.envGroups}
					<Select
						id="gen-env-group"
						placeholder="Add an env group"
						resetOnSelect
						disabled={envGroupOptions.length === 0}
						onchange={(v) => addEnvGroup(String(v))}
						options={envGroupOptions} />
				{/key}
				{#if gen.envGroups.length > 0}
					<div class="flex flex-wrap gap-2 mt-2">
						{#each gen.envGroups as name (name)}
							<span class="env-group-chip font-mono text-sm">
								{name}
								<button type="button" class="chip-remove" aria-label={`Remove ${name}`} onclick={() => removeEnvGroup(name)}>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</span>
						{/each}
					</div>
				{/if}
				<p class="text-content/50 text-sm mt-1">Each group must already exist in this project.</p>
			</div>

			{#if gen.buildType === 'dockerfile'}
				<div class="field">
					<label for="gen-pull-secret">Pull secret</label>
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<Select id="gen-pull-secret" bind:value={gen.pullSecret} options={pullSecretOptions} />
						</div>
						{#if canProvisionPullSecret}
							<button
								class="button is-variant-secondary"
								class:is-loading={creatingPullSecret}
								disabled={creatingPullSecret || !gen.location}
								onclick={createPullSecret}
								title="Create a dedicated pull-only service account and pull secret in this location"
								type="button">
								<i class="fa-solid fa-plus mr-2"></i>
								New
							</button>
						{:else}
							<span class="inline-flex" title={denyTooltip('pullsecret.create')}>
								<button class="button is-variant-secondary" type="button" disabled aria-disabled="true">
									<i class="fa-solid fa-plus mr-2"></i>
									New
								</button>
							</span>
						{/if}
					</div>
					{#if pullSecretError}
						<p class="text-negative text-sm mt-1">{pullSecretError}</p>
					{:else}
						<p class="text-content/50 text-sm mt-1">
							For a private image registry. <strong>New</strong> provisions a dedicated
							pull-only service account and secret for <span class="font-mono">registry.deploys.app</span>.
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<pre class="workflow-yaml font-mono text-sm">{workflowYaml}</pre>

		<div class="flex items-center gap-3">
			<button type="button" class="button is-variant-secondary copy-workflow" data-clipboard-text={workflowYaml}>
				<i class="fa-solid fa-copy mr-2"></i>
				<span>Copy</span>
			</button>
			<a class="button" href={createOnGitHubURL} target="_blank" rel="noreferrer">
				<i class="fa-brands fa-github mr-2"></i>
				<span>Create on GitHub</span>
			</a>
			<p class="text-content/50 text-sm">
				Opens GitHub's file editor pre-filled — commit it there.
			</p>
		</div>
	</div>
{/if}

<style>
	.workflow-yaml {
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-400) / 0.12);
		overflow-x: auto;
	}

	:root:not(.dark) .workflow-yaml {
		background-color: hsl(var(--hsl-base-100) / 0.6);
	}

	.env-group-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-400) / 0.12);
	}

	.chip-remove {
		display: inline-flex;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.chip-remove:hover {
		color: hsl(var(--hsl-negative));
	}
</style>
