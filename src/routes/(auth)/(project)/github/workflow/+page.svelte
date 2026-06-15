<script>
	import { onMount, untrack } from 'svelte'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip } from '$lib/permission'
	import { setupCopy } from '$lib/clipboard'
	import GitHubNav from '../_components/GitHubNav.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)
	const envGroups = $derived(data.envGroups)
	const canProvisionPullSecret = $derived(data.canProvisionPullSecret)

	const links = $derived(data.links)
	// Mutable so a freshly-provisioned pull secret is selectable without a reload.
	let pullSecrets = $state(untrack(() => data.pullSecrets))

	const locationOptions = $derived(locations.map((l) => ({ value: l.id, label: l.id })))

	// Derive a sensible deployment name from a `owner/name` repository: the repo
	// name, lowercased with anything outside [a-z0-9-] folded to a hyphen.
	/** @param {string | undefined} repository */
	function repoToName (repository) {
		const short = (repository ?? '').split('/').pop() ?? ''
		return short
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	// Default generator state for a repository with no saved config.
	/** @param {string | undefined} repository */
	function defaultGen (repository) {
		return {
			repository,
			location: data.locations[0]?.id ?? '',
			name: repoToName(repository) || 'web',
			buildType: 'dockerfile',
			port: 8080,
			framework: 'auto',
			buildCommand: '',
			outputDir: 'public',
			spa: false,
			notFound: '404.html',
			workingDirectory: '',
			env: '',
			/** @type {string[]} */
			envGroups: [],
			pullSecret: '',
			protocol: 'http',
			requireGoogleLogin: false,
			allowedEmails: '',
			allowedDomains: ''
		}
	}

	/** @param {string | undefined} repository */
	function savedConfigFor (repository) {
		return data.links.find((l) => l.repository === repository)?.workflowConfig
	}

	// Merge a link's saved workflow config (github.setWorkflowConfig) over the
	// defaults so the generator pre-fills the user's last-saved inputs. Missing
	// or empty fields fall back to defaults.
	/**
	 * @param {string | undefined} repository
	 * @param {Api.GitHubWorkflowConfig | undefined} cfg
	 */
	function genFromConfig (repository, cfg) {
		const d = defaultGen(repository)
		if (!cfg) return d
		return {
			repository,
			location: cfg.location || d.location,
			name: cfg.name || d.name,
			buildType: cfg.buildType || d.buildType,
			port: cfg.port || d.port,
			framework: cfg.framework || d.framework,
			buildCommand: cfg.buildCommand ?? d.buildCommand,
			outputDir: cfg.outputDir || d.outputDir,
			spa: cfg.spa ?? d.spa,
			notFound: cfg.notFound || d.notFound,
			workingDirectory: cfg.workingDirectory ?? d.workingDirectory,
			env: cfg.env ?? d.env,
			envGroups: cfg.envGroups ? [...cfg.envGroups] : d.envGroups,
			pullSecret: cfg.pullSecret ?? d.pullSecret,
			protocol: cfg.protocol || d.protocol,
			requireGoogleLogin: cfg.requireGoogleLogin ?? d.requireGoogleLogin,
			allowedEmails: cfg.allowedEmails ?? d.allowedEmails,
			allowedDomains: cfg.allowedDomains ?? d.allowedDomains
		}
	}

	// workflow generator — seed the repository from ?repo= (validated in the
	// loader against the linked set) so jumping in from a repository card lands
	// on the right repo, and pre-fill the build settings from that repo's saved
	// workflow config so users edit their current workflow instead of defaults.
	const gen = $state(untrack(() => genFromConfig(data.initialRepo, savedConfigFor(data.initialRepo))))
	const genRepoOptions = $derived(links.map((l) => ({ value: l.repository, label: l.repository })))
	const genLink = $derived(links.find((l) => l.repository === gen.repository))
	const genBranch = $derived(genLink?.productionBranch || 'main')
	// Which workflow runs deploy — drives the generated `on:` triggers.
	const genTrigger = $derived(genLink?.trigger ?? 'all')

	// Keep the deployment name defaulting to the selected repository's name until
	// the user edits it — switching repos then re-fills with the new repo name.
	// A saved config carries an explicit name, so treat the name as already set —
	// don't let the repo-name default overwrite it.
	let nameTouched = $state(untrack(() => !!savedConfigFor(data.initialRepo)?.name))
	$effect(() => {
		const derivedName = repoToName(gen.repository)
		if (!nameTouched && derivedName) gen.name = derivedName
	})

	// When the selected repository changes, pre-fill the generator from that
	// repo's saved workflow config (or reset to defaults). The initial load is
	// already seeded above, so this only fires on an actual switch.
	let configLoadedRepo = untrack(() => data.initialRepo)
	$effect(() => {
		const repo = gen.repository
		if (repo === configLoadedRepo) return
		configLoadedRepo = repo
		const cfg = savedConfigFor(repo)
		Object.assign(gen, genFromConfig(repo, cfg))
		nameTouched = !!cfg?.name
	})

	const buildTypeOptions = [
		{ value: 'dockerfile', label: 'Dockerfile', icon: 'fa-brands fa-docker', hint: 'Container image built from your Dockerfile' },
		{ value: 'static', label: 'Static', icon: 'fa-solid fa-bolt', hint: 'Prebuilt static site served from the CDN' }
	]
	const frameworkOptions = [
		{ value: 'auto', label: 'Auto-detect' },
		{ value: 'hugo', label: 'Hugo' },
		{ value: 'node', label: 'Node' }
	]
	const protocolOptions = [
		{ value: 'http', label: 'http' },
		{ value: 'https', label: 'https' },
		{ value: 'h2c', label: 'h2c' }
	]

	// Allow-list text -> trimmed entries (split on newline or comma, blanks dropped).
	/** @param {string} text */
	function splitList (text) {
		return text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
	}
	const allowedEmailsList = $derived(splitList(gen.allowedEmails))
	const allowedDomainsList = $derived(splitList(gen.allowedDomains))

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
			// http is the server default, so only emit a non-default protocol.
			if (gen.protocol && gen.protocol !== 'http') out.push(`        protocol: ${gen.protocol}`)
		}

		const wd = gen.workingDirectory.trim()
		if (wd && wd !== '.') out.push(`        workingDirectory: ${wd}`)

		// env / envGroups are container-only — static has no pod.
		if (gen.buildType === 'dockerfile') {
			const envLines = gen.env.split('\n').map((l) => l.trim()).filter(Boolean)
			if (envLines.length) {
				out.push('        env: |')
				for (const l of envLines) out.push(`          ${l}`)
			}

			if (gen.envGroups.length) out.push(`        envGroups: ${gen.envGroups.join(',')}`)
		}

		// Pull secret only applies to container deploys — static has no pod.
		if (gen.buildType === 'dockerfile' && gen.pullSecret) {
			out.push(`        pullSecret: ${gen.pullSecret}`)
		}

		// Access (deployment access) applies to both container and static. Only
		// emit when the gate is on; empty allow-lists = any signed-in Google
		// account, so omit them rather than emitting empty keys.
		if (gen.requireGoogleLogin) {
			out.push('        requireGoogleLogin: true')
			if (allowedEmailsList.length) out.push(`        allowedEmails: ${allowedEmailsList.join(',')}`)
			if (allowedDomainsList.length) out.push(`        allowedDomains: ${allowedDomainsList.join(',')}`)
		}

		return out.join('\n')
	}

	// The on: block matches the link's trigger: all = push + pull_request,
	// branch = push only, pr = pull_request only.
	const onBlock = $derived(
		'on:\n' +
		[
			genTrigger !== 'pr' ? `  push:\n    branches: [${genBranch}]` : null,
			genTrigger !== 'branch' ? '  pull_request:' : null
		].filter(Boolean).join('\n')
	)

	const workflowYaml = $derived(`name: Deploy
${onBlock}

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

	// Create opens a brand-new file pre-filled with the YAML; Edit opens the file
	// already in the repo. Both target the default branch (where the workflow file
	// lives), independent of the deploy trigger's branch. GitHub's /new flow errors
	// if the path already exists, and /edit can't pre-fill content — so editing
	// pairs with the Copy button (copy here, then paste over the existing file there).
	const createOnGitHubURL = $derived(gen.repository
		? `https://github.com/${gen.repository}/new/main?filename=.github/workflows/deploy.yaml&value=${encodeURIComponent(workflowYaml)}`
		: '')
	const editOnGitHubURL = $derived(gen.repository
		? `https://github.com/${gen.repository}/edit/main/.github/workflows/deploy.yaml`
		: '')

	// Persist the current generator inputs to the link so the next visit pre-fills
	// them. Fired (fire-and-forget) when the user clicks Create/Edit on GitHub —
	// it never blocks opening GitHub, and failures (e.g. no github.update
	// permission) are ignored.
	function saveWorkflowConfig () {
		const link = genLink
		if (!link) return
		const workflowConfig = {
			name: gen.name,
			location: gen.location,
			buildType: gen.buildType,
			port: gen.port,
			protocol: gen.protocol,
			framework: gen.framework,
			buildCommand: gen.buildCommand,
			outputDir: gen.outputDir,
			spa: gen.spa,
			notFound: gen.notFound,
			workingDirectory: gen.workingDirectory,
			env: gen.env,
			envGroups: [...gen.envGroups],
			pullSecret: gen.pullSecret,
			requireGoogleLogin: gen.requireGoogleLogin,
			allowedEmails: gen.allowedEmails,
			allowedDomains: gen.allowedDomains
		}
		Promise.resolve(api.invoke('github.setWorkflowConfig', {
			project, repositoryId: link.repositoryId, workflowConfig
		}, fetch)).catch(() => {})
	}

	onMount(() => setupCopy('.copy-workflow'))
</script>

<div class="page-head">
	<div>
		<h4><strong>GitHub</strong></h4>
		<p class="page-sub">Build and deploy linked repositories with GitHub Actions — keyless, with pull request previews</p>
	</div>
	<div>
		<GuardedButton permission="github.link" class="button is-variant-secondary is-icon-left" href={`/github/link?project=${project}`}>
			<i class="fa-solid fa-link"></i>
			Link repository
		</GuardedButton>
	</div>
</div>

<GitHubNav {project} />

{#if links.length === 0}
	<div class="panel is-level-300">
		<div class="empty-state">
			<i class="fa-solid fa-diagram-project empty-icon"></i>
			<span class="empty-title">Link a repository first</span>
			<span class="empty-sub">
				The workflow generator builds a GitHub Actions file for a linked repository.
				Link one to get started.
			</span>
			<GuardedButton permission="github.link" class="button is-icon-left mt-3" href={`/github/link?project=${project}`}>
				<i class="fa-solid fa-link"></i>
				Link repository
			</GuardedButton>
		</div>
	</div>
{:else}
	<div class="wf-layout">
		<div class="panel is-level-300 grid gap-6 wf-config">
			<div>
				<h6><strong>Generate workflow</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Configure the deploy action, then drop the file into your repository.
					{#if genTrigger === 'pr'}
						This repository is pull-request only — it posts a preview on every pull request and never deploys a branch.
					{:else if genTrigger === 'branch'}
						It deploys on push to the production branch. Pull requests get no preview.
					{:else}
						It deploys on push to the production branch and posts a preview on every pull request.
					{/if}
				</p>
			</div>

			<div class="grid gap-4 w-full">
				<div class="form-section is-first">
					<h6 class="form-section-title">Repository &amp; target</h6>
					<span class="form-section-hint">Which linked repository this workflow belongs to, and where it deploys.</span>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="field">
						<label for="gen-repository">Repository</label>
						<Select id="gen-repository" bind:value={gen.repository} options={genRepoOptions} />
					</div>
					<div class="field">
						<label for="gen-location">Location</label>
						<Select id="gen-location" bind:value={gen.location} options={locationOptions} />
					</div>
					<div class="field sm:col-span-2">
						<label for="gen-name">Deployment name</label>
						<div class="input">
							<input id="gen-name" class="font-mono" bind:value={gen.name} oninput={() => nameTouched = true} placeholder="web">
						</div>
						<span class="helper">The deployment created in this project. Defaults to the repository name.</span>
					</div>
				</div>

				<div class="form-section">
					<h6 class="form-section-title">Build</h6>
					<span class="form-section-hint">How your app is built and served.</span>
				</div>

				<div>
					<span class="label">Build type</span>
					<div class="seg" role="group" aria-label="Build type">
						{#each buildTypeOptions as opt (opt.value)}
							<button
								type="button"
								class="seg-btn"
								class:is-active={gen.buildType === opt.value}
								aria-label={opt.label}
								aria-pressed={gen.buildType === opt.value}
								onclick={() => (gen.buildType = opt.value)}>
								<i class="{opt.icon} seg-icon"></i>
								<span class="seg-text">
									<span class="seg-title">{opt.label}</span>
									<span class="seg-hint">{opt.hint}</span>
								</span>
								{#if gen.buildType === opt.value}
									<i class="fa-solid fa-circle-check seg-check"></i>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				{#if gen.buildType === 'dockerfile'}
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="field">
							<label for="gen-port">Port</label>
							<div class="input">
								<input id="gen-port" type="number" min="1" bind:value={gen.port} placeholder="8080">
							</div>
							<span class="helper">The port your container listens on.</span>
						</div>
						<div class="field">
							<label for="gen-protocol">Protocol</label>
							<Select id="gen-protocol" bind:value={gen.protocol} options={protocolOptions} />
							<span class="helper">Use <span class="font-mono">h2c</span> for gRPC / HTTP/2 cleartext.</span>
						</div>
						<div class="field">
							<label for="gen-working-directory">Root folder</label>
							<div class="input">
								<input id="gen-working-directory" class="font-mono" bind:value={gen.workingDirectory} placeholder=". (monorepo: apps/web)">
							</div>
							<span class="helper">Build context, relative to the repo root.</span>
						</div>
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2">
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
						<div class="field">
							<label for="gen-working-directory">Root folder</label>
							<div class="input">
								<input id="gen-working-directory" class="font-mono" bind:value={gen.workingDirectory} placeholder=". (monorepo: apps/web)">
							</div>
						</div>
						<div class="field self-end">
							<div class="checkbox">
								<input id="gen-spa" type="checkbox" bind:checked={gen.spa}>
								<label for="gen-spa">SPA fallback to index.html</label>
							</div>
						</div>
					</div>
				{/if}

				<!-- env, env groups, and pull secret are container-only; static has no
				     pod, so the whole block is hidden and omitted from the workflow. -->
				{#if gen.buildType === 'dockerfile'}
					<div class="form-section">
						<h6 class="form-section-title">Environment</h6>
						<span class="form-section-hint">Optional configuration passed to the running container.</span>
					</div>

					<div class="field">
						<label for="gen-env">Environment variables</label>
						<div class="textarea">
							<textarea id="gen-env" class="font-mono" rows="4" bind:value={gen.env} placeholder="KEY=value&#10;ANOTHER=thing"></textarea>
						</div>
						<span class="helper">One <span class="font-mono">KEY=VALUE</span> per line.</span>
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
						<span class="helper">Each group must already exist in this project.</span>
					</div>

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
							<span class="helper">
								For a private image registry. <strong>New</strong> provisions a dedicated
								pull-only service account and secret for <span class="font-mono">registry.deploys.app</span>.
							</span>
						{/if}
					</div>
				{/if}

				<!-- Access (deployment access) applies to both container and static
				     deployments, so it lives outside the dockerfile-only block. -->
				<div class="form-section">
					<h6 class="form-section-title">Access</h6>
					<span class="form-section-hint">Restrict who can reach the deployment over the web.</span>
				</div>

				<div class="field">
					<div class="checkbox">
						<input id="gen-require-google-login" type="checkbox" bind:checked={gen.requireGoogleLogin}>
						<label for="gen-require-google-login">Require Google login</label>
					</div>
					<span class="helper">When off, the deployment is public. Programmatic/API clients cannot bypass the gate.</span>
					{#if gen.requireGoogleLogin && allowedEmailsList.length === 0 && allowedDomainsList.length === 0}
						<span class="helper">Any signed-in Google account can access — add emails or domains to restrict.</span>
					{/if}
					{#if gen.requireGoogleLogin && gen.buildType === 'static'}
						<span class="helper">Enabling login forfeits edge caching for this site.</span>
					{/if}
				</div>

				{#if gen.requireGoogleLogin}
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="field">
							<label for="gen-allowed-emails">Allowed emails</label>
							<div class="textarea">
								<textarea id="gen-allowed-emails" class="font-mono" rows="3" bind:value={gen.allowedEmails} placeholder="alice@example.com&#10;bob@example.com"></textarea>
							</div>
							<span class="helper">One per line or comma-separated.</span>
						</div>
						<div class="field">
							<label for="gen-allowed-domains">Allowed domains</label>
							<div class="textarea">
								<textarea id="gen-allowed-domains" class="font-mono" rows="3" bind:value={gen.allowedDomains} placeholder="example.com&#10;corp.example.com"></textarea>
							</div>
							<span class="helper">Email domains. Empty = any Google account.</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<aside class="wf-preview">
			<div class="yaml-card">
				<div class="yaml-card-head">
					<span class="yaml-file font-mono">
						<i class="fa-regular fa-file-code"></i>
						.github/workflows/deploy.yaml
					</span>
					<button type="button" class="yaml-copy copy-workflow" data-clipboard-text={workflowYaml}>
						<i class="fa-regular fa-copy"></i>
						<span class="yaml-copy-label">Copy</span>
						<span class="yaml-copy-done"><i class="fa-solid fa-check mr-1"></i>Copied</span>
					</button>
				</div>
				<pre class="workflow-yaml font-mono">{workflowYaml}</pre>
			</div>

			<div class="wf-actions">
				<a class="button is-icon-left wf-action" href={createOnGitHubURL} target="_blank" rel="noreferrer" onclick={saveWorkflowConfig}>
					<i class="fa-brands fa-github"></i>
					Create on GitHub
				</a>
				<a class="button is-variant-secondary is-icon-left wf-action" href={editOnGitHubURL} target="_blank" rel="noreferrer" onclick={saveWorkflowConfig}>
					<i class="fa-brands fa-github"></i>
					Edit on GitHub
				</a>
				<span class="helper">First time? <strong>Create on GitHub</strong> opens a new file pre-filled with this workflow. Updating an existing workflow? <strong>Copy</strong> it above, then <strong>Edit on GitHub</strong> opens the current file to paste over.</span>
			</div>
		</aside>
	</div>
{/if}

<style>
	.wf-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		align-items: start;
	}

	@media (min-width: 1280px) {
		.wf-layout {
			grid-template-columns: minmax(0, 1fr) 30rem;
		}

		.wf-preview {
			position: sticky;
			/* Clear the fixed navbar (4rem) plus a little breathing room. */
			top: 5rem;
		}
	}

	.wf-config .helper {
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.8125rem;
	}

	/* Segmented build-type control — two side-by-side option cards. */
	.seg {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.625rem;
	}

	@media (min-width: 480px) {
		.seg { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}

	.seg-btn {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.875rem;
		text-align: left;
		cursor: pointer;
		background-color: hsl(var(--hsl-base-400) / 0.18);
		border: 1px solid hsl(var(--hsl-base-400) / 0.3);
		border-radius: var(--radius-md);
		color: inherit;
		transition: border-color var(--timing-faster) ease, background-color var(--timing-faster) ease;
	}

	:root:not(.dark) .seg-btn {
		border-color: hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-100));
	}

	.seg-btn:hover {
		border-color: hsl(var(--hsl-primary) / 0.45);
	}

	.seg-btn.is-active {
		border-color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.08);
	}

	.seg-icon {
		flex-shrink: 0;
		width: 1.75rem;
		font-size: 1.25rem;
		text-align: center;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.seg-btn.is-active .seg-icon {
		color: hsl(var(--hsl-primary));
	}

	.seg-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.seg-title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.seg-hint {
		font-size: 0.75rem;
		line-height: 1.35;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.seg-check {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 0.8rem;
		color: hsl(var(--hsl-primary));
	}

	/* The YAML "file" — a header bar with the filename + copy, then the body. */
	.yaml-card {
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-lg);
		overflow: hidden;
		background-color: hsl(var(--hsl-base-400) / 0.12);
		box-shadow: var(--raised-z1);
	}

	:root:not(.dark) .yaml-card {
		background-color: hsl(var(--hsl-base-100));
	}

	.yaml-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.5rem 0.5rem 0.875rem;
		border-bottom: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-content) / 0.03);
	}

	.yaml-file {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		font-size: 0.78rem;
		color: hsl(var(--hsl-content) / 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.yaml-file > i { color: hsl(var(--hsl-primary)); }

	.yaml-copy {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		cursor: pointer;
		transition: background-color var(--timing-faster) ease, color var(--timing-faster) ease, border-color var(--timing-faster) ease;
	}

	.yaml-copy:hover {
		background-color: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content));
	}

	/* Swap the label for a confirmation when clipboard.js stamps data-copied at
	 * runtime. The attribute isn't in the template, so :global keeps Svelte from
	 * pruning these as "unused". */
	.yaml-copy-done { display: none; }
	.yaml-copy:global([data-copied]) { color: hsl(var(--hsl-positive)); border-color: hsl(var(--hsl-positive) / 0.4); }
	.yaml-copy:global([data-copied]) .yaml-copy-label { display: none; }
	.yaml-copy:global([data-copied]) .yaml-copy-done { display: inline-flex; align-items: center; }

	/* Reset the global <pre> chrome — the card supplies the frame. */
	.workflow-yaml {
		margin: 0;
		padding: 1rem;
		border: 0;
		border-radius: 0;
		background-color: transparent;
		font-size: 0.78rem;
		line-height: 1.55;
		max-height: 28rem;
		overflow: auto;
	}

	@media (min-width: 1280px) {
		.workflow-yaml { max-height: calc(100vh - 14rem); }
	}

	.wf-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.wf-actions .helper {
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.8125rem;
	}

	.wf-action { width: 100%; }

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
