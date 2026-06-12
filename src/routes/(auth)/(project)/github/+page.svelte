<script>
	import { onMount, untrack } from 'svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'
	import { setupCopy } from '$lib/clipboard'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)
	const error = $derived(data.error)

	let links = $state(untrack(() => data.links))

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
		port: 8080
	})))
	const genRepoOptions = $derived(links.map((l) => ({ value: l.repository, label: l.repository })))

	const workflowYaml = $derived(`name: Deploy
on:
  push:
    branches: [main]
  pull_request:

permissions:
  id-token: write   # required — this is the credential
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: deploys-app/build-deploy-action@v1
      with:
        project: ${project}
        location: ${gen.location}
        name: ${gen.name || 'web'}
        port: ${Number(gen.port) || 8080}
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
		<a class="button" href={`/github/link?project=${project}`}>
			<i class="fa-solid fa-link mr-2"></i>
			Link repository
		</a>
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
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							<button class="icon-button" type="button" aria-label="Unlink repository" onclick={() => unlink(it)}>
								<i class="fa-solid fa-link-slash"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={links} />
				<ErrorRow span={4} {error} />
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
				<label for="gen-port">Port</label>
				<div class="input">
					<input id="gen-port" type="number" min="1" bind:value={gen.port} placeholder="8080">
				</div>
			</div>
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
</style>
