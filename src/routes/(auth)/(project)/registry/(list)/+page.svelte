<script>
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const repositories = $derived(data.repositories)
	const error = $derived(data.error)
	const storage = $derived(data.storage)

	function deleteRepository (name) {
		modal.confirm({
			title: `Delete "${name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('registry/delete', { project, repository: name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('registry/list')
			}
		})
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Registry</strong></h4>
		<p class="page-sub">Container image registry</p>
	</div>
	<a class="button is-variant-secondary is-icon-left" href={`/registry/usage?project=${project}`}>
		<i class="fa-solid fa-chart-line"></i>
		Usage
	</a>
</div>
{#if storage !== null}
	<div class="stat-grid">
		<div class="stat-tile">
			<div class="stat-head">Total storage</div>
			<div class="stat-value">{format.storage(storage.size)}</div>
			<div class="stat-foot">
				across {repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'}
			</div>
		</div>
	</div>
{/if}

<div class="panel is-level-300">
	<p>registry.deploys.app/{project}/{'{repository}'}:{'{tag}'}</p>
	<div class="table-container mt-4">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Repository</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each repositories as repo (repo.name)}
					<tr>
						<td>
							<a class="link"
							   href="/registry/detail?project={project}&repository={repo.name}">
								{repo.name}
							</a>
						</td>
						<td>
							<button class="icon-button" aria-label="Remove" onclick={() => deleteRepository(repo.name)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={2} list={repositories} />
				<ErrorRow span={2} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	/* KPI card — mirrors the firewall metrics "total" stat tile. */
	.stat-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 280px));
		margin-bottom: 1rem;
	}

	.stat-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1rem 1.125rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, hsl(var(--hsl-primary) / 0.12) 0%, hsl(var(--hsl-accent) / 0.12) 100%);
		border: 1px solid hsl(var(--hsl-primary) / 0.2);
		overflow: hidden;
	}

	.stat-tile::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 3px;
		background: linear-gradient(hsl(var(--hsl-primary)), hsl(var(--hsl-accent)));
	}

	.stat-head {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.stat-value {
		font-size: 1.9rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-primary));
	}

	.stat-foot {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
	}
</style>
