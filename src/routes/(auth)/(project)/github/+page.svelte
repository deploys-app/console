<script lang="ts">
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import EditGithubLinkModal from '$lib/components/EditGithubLinkModal.svelte'
	import * as format from '$lib/format'
	import GitHubNav from './_components/GitHubNav.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const error = $derived(data.error)
	const serviceAccounts = $derived(data.serviceAccounts)

	const { can } = getPermissionContext()
	$effect(() => {
		if (!can('github.link')) return
		return registerPageActions([{
			id: 'github-list:link',
			label: 'Link repository',
			icon: 'fa-link',
			keywords: 'link add connect repository repo github',
			href: `/github/link?project=${project}`
		}])
	})

	// Derived from the loader so switching project (same /github route → this
	// component is reused, only `data.links` changes) re-syncs the list. Writable
	// so unlink/edit can update it in place until the next load (fixes #219).
	let links = $derived(data.links)

	let editModal = $state<EditGithubLinkModal | null>(null)

	async function reloadLinks () {
		const resp = await api.invoke<Api.List<Api.GithubLink>>('github.list', { project }, fetch)
		if (resp.ok) links = resp.result?.items ?? []
	}

	function edit (it: Api.GithubLink) {
		editModal?.open(it)
	}

	function unlink (it: Api.GithubLink) {
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

	function workflowHref (repository: string) {
		return `/github/workflow?project=${project}&repo=${encodeURIComponent(repository)}`
	}

	function triggerLabel (trigger: Api.GithubLink['trigger']) {
		if (trigger === 'pr') return 'PR previews only'
		if (trigger === 'branch') return 'Branch only'
		return 'Branch + PR previews'
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>GitHub</strong></h4>
		<p class="page-sub">Build and deploy linked repositories with GitHub Actions — keyless, with pull request previews</p>
	</div>
	<div>
		<GuardedButton permission="github.link" class="button is-icon-left" href={`/github/link?project=${project}`}>
			<i class="fa-solid fa-link"></i>
			Link repository
		</GuardedButton>
	</div>
</div>

<GitHubNav {project} />

{#if links.length > 0}
	<div class="repo-grid">
		{#each links as it (it.repositoryId)}
			<article class="repo-card">
				<header class="repo-card-head">
					<span class="repo-mark"><i class="fa-brands fa-github"></i></span>
					<a class="repo-name link" href={`https://github.com/${it.repository}`} target="_blank" rel="noreferrer">
						{it.repository}
					</a>
					<GuardedButton permission="github.update" class="icon-button repo-edit" type="button"
						aria-label={`Edit ${it.repository}`} onclick={() => edit(it)}>
						<i class="fa-solid fa-pen"></i>
					</GuardedButton>
					<GuardedButton permission="github.unlink" class="icon-button repo-unlink" type="button"
						aria-label={`Unlink ${it.repository}`} onclick={() => unlink(it)}>
						<i class="fa-solid fa-link-slash"></i>
					</GuardedButton>
				</header>

				<dl class="repo-meta">
					<div>
						<dt>Service account</dt>
						<dd class="font-mono" title={it.serviceAccountEmail}>{it.serviceAccountEmail}</dd>
					</div>
					<div>
						<dt>Deploy trigger</dt>
						<dd>
							<span class="branch-pill font-mono"><i class="fa-solid fa-bolt"></i>{triggerLabel(it.trigger)}</span>
						</dd>
					</div>
					<div>
						<dt>Production branch</dt>
						<dd>
							{#if it.trigger === 'pr'}
								<span class="text-content/45" title="Previews-only links never deploy a branch">—</span>
							{:else if it.productionBranch}
								<span class="branch-pill font-mono"><i class="fa-solid fa-code-branch"></i>{it.productionBranch}</span>
							{:else}
								<span class="text-content/45" title="Any branch can deploy">Any branch</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt>Linked</dt>
						<dd title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</dd>
					</div>
				</dl>

				<footer class="repo-card-foot">
					<a class="button is-variant-secondary is-icon-left repo-workflow-btn" href={workflowHref(it.repository)}>
						<i class="fa-solid fa-diagram-project"></i>
						Set up workflow
					</a>
				</footer>
			</article>
		{/each}
	</div>
{:else if error}
	<div class="panel is-level-300">
		<div class="empty-state">
			<i class="fa-solid fa-triangle-exclamation empty-icon"></i>
			<span class="empty-title">Couldn't load repositories</span>
			<span class="empty-sub">{error.forbidden ? "You don't have permission to view linked repositories." : (error.message || 'Try again later.')}</span>
		</div>
	</div>
{:else}
	<div class="panel is-level-300">
		<div class="empty-state">
			<i class="fa-brands fa-github empty-icon"></i>
			<span class="empty-title">No repositories linked yet</span>
			<span class="empty-sub">
				Link a GitHub repository so its Actions workflows can deploy here —
				authenticated by GitHub OIDC, with no stored secrets.
			</span>
			<GuardedButton permission="github.link" class="button is-icon-left mt-3" href={`/github/link?project=${project}`}>
				<i class="fa-solid fa-link"></i>
				Link repository
			</GuardedButton>
		</div>
	</div>
{/if}

<EditGithubLinkModal bind:this={editModal} {project} {serviceAccounts} onsaved={reloadLinks} />

<style>
	.repo-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.repo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}

	@media (min-width: 1280px) {
		.repo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	}

	.repo-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
		background-color: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-lg);
		box-shadow: var(--raised-z1);
		transition: border-color var(--timing-faster) ease, box-shadow var(--timing-faster) ease, transform var(--timing-faster) ease;
	}

	.repo-card:hover {
		border-color: hsl(var(--hsl-primary) / 0.35);
		box-shadow: var(--raised-z3);
		transform: translateY(-2px);
	}

	.repo-card-head {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
	}

	.repo-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-md);
		font-size: 1rem;
		color: hsl(var(--hsl-content) / 0.8);
		background-color: hsl(var(--hsl-content) / 0.06);
	}

	.repo-name {
		flex: 1;
		min-width: 0;
		font-weight: 600;
		font-size: 0.95rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* The edit/unlink controls are rendered by GuardedButton (a child component),
	 * so they don't carry this component's scope hash — reach them via :global,
	 * anchored under .repo-card so they can't leak. */
	.repo-card :global(.repo-edit),
	.repo-card :global(.repo-unlink) {
		flex-shrink: 0;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.repo-card :global(.repo-edit):hover {
		color: hsl(var(--hsl-primary));
	}

	.repo-card :global(.repo-unlink):hover {
		color: hsl(var(--hsl-negative));
	}

	.repo-meta {
		display: grid;
		gap: 0.625rem;
		padding-top: 1rem;
		border-top: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.repo-meta > div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		min-width: 0;
	}

	.repo-meta dt {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--hsl-content) / 0.45);
	}

	.repo-meta dd {
		min-width: 0;
		font-size: 0.82rem;
		color: hsl(var(--hsl-content) / 0.8);
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.branch-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.05rem 0.45rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.1);
	}

	.branch-pill > i { font-size: 0.62rem; opacity: 0.85; }

	.repo-card-foot {
		margin-top: auto;
	}

	.repo-workflow-btn {
		width: 100%;
	}
</style>
