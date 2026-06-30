<script lang="ts">
	import type { PageData } from './$types'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import ModalSelectProject from '../ModalSelectProject.svelte'

	const { data }: { data: PageData } = $props()

	const projects = $derived(data.projects)

	let projectModal = $state<ModalSelectProject | null>(null)

	// Press "/" anywhere on the page (unless typing in a field) to open the
	// project search modal.
	function onKeydown (e: KeyboardEvent) {
		if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
		const el = e.target
		if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) {
			return
		}
		e.preventDefault()
		projectModal?.open()
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown)
		return () => window.removeEventListener('keydown', onKeydown)
	})

	async function deleteItem (project: string): Promise<void> {
		// Type-to-confirm: the Delete button stays disabled until the typed name
		// matches, so a confirmed result is always exactly `project`.
		const result = await modal.prompt({
			title: 'Are you sure?',
			text: `Type "${project}" to confirm!`,
			placeholder: project,
			yes: 'Delete',
			variant: 'is-variant-negative',
			requireMatch: project
		})
		if (result === null) {
			return
		}

		const resp = await api.invoke('project.delete', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		await api.invalidate('project.list')
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Projects</strong></h4>
		<p class="page-sub">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
	</div>
	<div class="flex items-center gap-3 flex-wrap">
		<button type="button" class="project-search" onclick={() => projectModal?.open()}>
			<i class="fa-solid fa-magnifying-glass"></i>
			<span>Search projects</span>
			<kbd>/</kbd>
		</button>
		<a class="button is-icon-left" href="/project/create">
			<i class="fa-solid fa-plus"></i>
			New project
		</a>
	</div>
</div>

{#if projects.length}
	<div class="project-grid">
		{#each projects as it (it.project)}
			<div class="project-card">
				<a class="project-open" href={`/?project=${it.project}`} aria-label={`Open ${it.name}`}>
					<span class="project-avatar" aria-hidden="true">{(it.name || it.project).slice(0, 1).toUpperCase()}</span>
					<span class="project-meta">
						<strong class="project-name">{it.name}</strong>
						<span class="project-id mono">{it.project}</span>
					</span>
					<i class="fa-solid fa-arrow-right project-go"></i>
				</a>
				<div class="project-foot">
					<span class="project-number mono" title="Project number">{it.id}</span>
					<div class="project-actions">
						<a href={`/project/create?project=${it.project}`} aria-label="Edit">
							<div class="icon-button"><i class="fa-solid fa-pen"></i></div>
						</a>
						<button class="icon-button" aria-label="Remove" onclick={() => deleteItem(it.project)}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
				</div>
			</div>
		{/each}

		<a class="project-card project-create" href="/project/create">
			<i class="fa-solid fa-plus"></i>
			<span>New project</span>
		</a>
	</div>
{:else}
	<div class="panel is-level-300">
		<div class="empty-state">
			<i class="fa-solid fa-diagram-project empty-icon"></i>
			<p class="empty-title">No projects yet</p>
			<p class="empty-sub">Create your first project to start deploying.</p>
			<a class="button is-icon-left mt-2" href="/project/create">
				<i class="fa-solid fa-plus"></i>
				New project
			</a>
		</div>
	</div>
{/if}

<ModalSelectProject bind:this={projectModal} {projects} />

<style>
	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: 1rem;
	}

	.project-card {
		display: flex;
		flex-direction: column;
		background-color: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-lg);
		box-shadow: var(--raised-z1);
		transition: border-color var(--timing-faster) ease, box-shadow var(--timing-faster) ease, transform var(--timing-faster) ease;
	}

	.project-card:hover {
		border-color: hsl(var(--hsl-primary) / 0.5);
		box-shadow: var(--raised-z3);
		transform: translateY(-2px);
	}

	.project-open {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 1.125rem 1.25rem;
	}

	.project-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-md);
		font-family: var(--ffml-secondary);
		font-size: 1.125rem;
		font-weight: 700;
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
	}

	.project-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.project-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-id {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-go {
		color: hsl(var(--hsl-content) / 0.3);
		transition: color var(--timing-faster) ease, transform var(--timing-faster) ease;
	}

	.project-card:hover .project-go {
		color: hsl(var(--hsl-primary));
		transform: translateX(2px);
	}

	.project-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem 0.625rem 1.25rem;
		border-top: 1px solid hsl(var(--hsl-line));
	}

	.project-number {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.45);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.project-create {
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 8rem;
		color: hsl(var(--hsl-content) / 0.6);
		font-weight: 600;
		border-style: dashed;
		box-shadow: none;
	}

	.project-create:hover {
		color: hsl(var(--hsl-primary));
		transform: none;
	}

	/* Search affordance that also advertises the "/" shortcut. */
	.project-search {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
		background-color: hsl(var(--hsl-base-100));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: border-color var(--timing-faster) ease, color var(--timing-faster) ease;
	}

	.project-search:hover {
		border-color: hsl(var(--hsl-primary) / 0.45);
		color: hsl(var(--hsl-content) / 0.85);
	}

	.project-search kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.35rem;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.7);
		background-color: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: 0.3rem;
	}

	@media (max-width: 640px) {
		.project-search span {
			display: none;
		}
	}
</style>
