<script>
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import CreateServiceAccountModal from '$lib/components/CreateServiceAccountModal.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const installUrl = $derived(data.installUrl)
	const linkedRepoIds = $derived(new Set(data.linkedRepoIds))

	/** @type {Api.GithubRepoItem[]} */
	let repos = $state([])
	/** @type {Api.Error | undefined} */
	let repoError = $state(undefined)
	let loadingRepos = $state(false)
	let loadedOnce = $state(false)

	const displayError = $derived(repoError ?? data.addInstallationError)

	async function loadRepos () {
		if (loadingRepos) return

		loadingRepos = true
		repoError = undefined
		try {
			/** @type {Record<number, Api.GithubRepoItem>} */
			const repoMap = {}

			await Promise.all(
				data.installationIds.map(async (installationId) => {
					const resp = await api.invoke('github.listRepos', { project, installationId }, fetch)
					if (!resp.ok) {
						repoError = resp.error
						return
					}
					for (const item of resp.result?.items ?? []) {
						if (!(item.repositoryId in repoMap)) {
							repoMap[item.repositoryId] = { ...item, installationId }
						}
					}
				})
			)

			repos = Object.values(repoMap).sort((a, b) => a.repository.localeCompare(b.repository))

			// If the selected repo disappeared after a refresh, clear the selection.
			if (selectedRepoName !== '' && !repos.some((r) => r.repository === selectedRepoName)) {
				selectedRepoName = ''
			}
		} finally {
			loadedOnce = true
			loadingRepos = false
		}
	}

	onMount(() => {
		if (data.installationIds.length === 0) {
			loadedOnce = true
			return
		}
		loadRepos()
	})

	// Repos not yet linked
	const availableRepos = $derived(repos.filter((r) => !linkedRepoIds.has(r.repositoryId)))
	const hiddenCount = $derived(repos.length - availableRepos.length)

	const repoOptions = $derived(availableRepos.map((r) => ({
		value: r.repository,
		label: r.repository
	})))

	// Service accounts created inline via the modal, merged with the loaded list
	// so a freshly-created SA is immediately selectable without a full reload.
	/** @type {{ sid: string, name: string }[]} */
	let extraServiceAccounts = $state([])

	const serviceAccounts = $derived([...data.serviceAccounts, ...extraServiceAccounts])

	const serviceAccountOptions = $derived(serviceAccounts.map((sa) => ({
		value: sa.sid,
		label: `${sa.sid} — ${sa.name}`
	})))

	/** @type {CreateServiceAccountModal} */
	let createServiceAccountModal = $state(/** @type {any} */ (undefined))

	/** @param {{ sid: string, name: string, email: string }} sa */
	function onServiceAccountCreated (sa) {
		if (!extraServiceAccounts.some((s) => s.sid === sa.sid) &&
			!data.serviceAccounts.some((s) => s.sid === sa.sid)) {
			extraServiceAccounts = [...extraServiceAccounts, { sid: sa.sid, name: sa.name }]
		}
		selectedServiceAccount = sa.sid
	}

	let selectedRepoName = $state('')
	let selectedServiceAccount = $state('')
	let productionBranch = $state('main')
	// Which workflow runs deploy. 'pr' has no production branch, so the branch
	// input is cleared + disabled for it.
	let trigger = $state('all')
	let linking = $state(false)

	const triggerOptions = [
		{ value: 'all', label: 'Branch + PR previews' },
		{ value: 'branch', label: 'Branch only (no previews)' },
		{ value: 'pr', label: 'PR previews only (no branch deploys)' }
	]

	const selectedRepo = $derived(
		selectedRepoName !== '' ? repos.find((r) => r.repository === selectedRepoName) : undefined
	)
	const canLink = $derived(!!selectedRepo && !!selectedServiceAccount)

	const installHref = $derived(
		installUrl + (project ? `?state=${encodeURIComponent(project)}` : '')
	)

	async function link () {
		if (linking || !canLink || !selectedRepo) return

		linking = true
		try {
			const resp = await api.invoke('github.link', {
				project,
				repositoryId: selectedRepo.repositoryId,
				repository: selectedRepo.repository,
				installationId: selectedRepo.installationId,
				serviceAccount: selectedServiceAccount,
				productionBranch: trigger === 'pr' ? '' : productionBranch.trim(),
				trigger
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/github?project=${project}`)
		} finally {
			linking = false
		}
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/github?project=${project}`} class="link"><h6>GitHub</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Link repository</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Link a GitHub repository</strong></h4>
		<p class="page-sub">Connect a repository so its GitHub Actions workflows can deploy to this project.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div>
		<h6><strong>Step 1 — Install the GitHub App</strong></h6>
		<p class="text-content/50 text-sm mt-1">
			Grant the deploys.app GitHub App access to the repositories you want to link.
			Already installed? Use the same link to add more repositories.
		</p>
	</div>
	<div>
		{#if installUrl}
			<a class="button is-variant-secondary" href={installHref}>
				<i class="fa-brands fa-github mr-2"></i>
				Install GitHub App
			</a>
		{:else}
			<p class="text-content/50 text-sm">
				The GitHub App is not available right now{data.error ? ` — ${data.error.message}` : ''}. Try again later.
			</p>
		{/if}
	</div>
</div>

<br>

<div class="panel is-level-300 grid gap-6">
	<div>
		<h6><strong>Step 2 — Pick a repository</strong></h6>
		{#if displayError}
			<p class="text-negative text-sm mt-1">Couldn't load repositories: {displayError.message}</p>
		{/if}
		<p class="text-content/50 text-sm mt-1">
			{#if loadedOnce && repos.length === 0 && !displayError}
				No repositories found. Complete step 1 to grant access — GitHub will redirect back here automatically.
			{:else if repos.length > 0}
				Select a repository from those visible to the installed GitHub App.
				Just created a repository on GitHub? Hit Refresh to pick it up.
				{#if hiddenCount > 0}
					<span class="text-content/40">{hiddenCount} {hiddenCount === 1 ? 'repository is' : 'repositories are'} already linked and hidden.</span>
				{/if}
			{/if}
		</p>
		<p class="text-content/50 text-sm mt-1">
			Workflows deploy as the linked service account — it needs
			<span class="font-mono">deployment.deploy</span>,
			<span class="font-mono">deployment.get</span>,
			<span class="font-mono">deployment.delete</span>,
			<span class="font-mono">registry.push</span> and
			<span class="font-mono">site.publish</span> (static-web publishing).
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="field">
			<label for="link-repository">Repository</label>
			<div class="flex items-center gap-2">
				<div class="flex-1">
					<Select
						id="link-repository"
						bind:value={selectedRepoName}
						options={repoOptions}
						placeholder={loadingRepos ? 'Loading repositories…' : 'Search repositories…'}
						editable={true}
						disabled={loadingRepos || repoOptions.length === 0} />
				</div>
				<button
					class="button is-variant-secondary"
					class:is-loading={loadingRepos}
					disabled={loadingRepos}
					onclick={loadRepos}
					aria-label="Refresh"
					title="Re-fetch the repository list — newly created repos appear after Refresh"
					type="button">
					<i class="fa-solid fa-rotate"></i>
				</button>
			</div>
		</div>
		<div class="field">
			<label for="link-service-account">Service account</label>
			<div class="flex items-center gap-2">
				<div class="flex-1">
					<Select
						id="link-service-account"
						bind:value={selectedServiceAccount}
						options={serviceAccountOptions}
						placeholder="Select a service account" />
				</div>
				<button
					class="button is-variant-secondary"
					disabled={!data.canCreateServiceAccount}
					onclick={() => createServiceAccountModal.open()}
					title={data.canCreateServiceAccount
						? 'Create a new deploy service account without leaving this page'
						: 'You need the serviceAccount.create permission to create one here.'}
					type="button">
					<i class="fa-solid fa-plus mr-2"></i>
					New
				</button>
			</div>
		</div>
		<div class="field">
			<label for="link-trigger">Deploy trigger</label>
			<Select
				id="link-trigger"
				bind:value={trigger}
				options={triggerOptions} />
			<p class="text-content/50 text-sm mt-1">
				{#if trigger === 'pr'}
					Only pull requests deploy (each a preview). Pushes to any branch are rejected — no production deploys.
				{:else if trigger === 'branch'}
					Pushes to the production branch deploy; pull requests get no preview.
				{:else}
					Pushes to the production branch deploy, and every pull request gets a preview.
				{/if}
			</p>
		</div>
		<div class="field">
			<label for="link-production-branch">Production branch</label>
			<div class="input">
				<input id="link-production-branch" class="font-mono" bind:value={productionBranch} placeholder="main" disabled={trigger === 'pr'}>
			</div>
			<p class="text-content/50 text-sm mt-1">
				{#if trigger === 'pr'}
					Not used — previews-only links never deploy a branch.
				{:else}
					Deploys are only accepted from this branch. Leave empty to allow any branch.
				{/if}
			</p>
		</div>
	</div>

	<div class="flex items-center gap-3">
		<button
			class="button"
			class:is-loading={linking}
			disabled={linking || !canLink}
			onclick={link}
			type="button">
			Link
		</button>
		{#if serviceAccounts.length === 0}
			<p class="text-content/50 text-sm">
				No service accounts yet — <a class="link" href={`/service-account/create?project=${project}`}>create one</a> first.
			</p>
		{/if}
	</div>
</div>

<CreateServiceAccountModal
	bind:this={createServiceAccountModal}
	{project}
	canGrantRole={data.canGrantRole}
	oncreated={onServiceAccountCreated} />
