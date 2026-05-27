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

<div class="panel is-level-300">
	<p>registry.deploys.app/{project}/{'{repository}'}:{'{tag}'}</p>
	{#if storage !== null}
		<p class="mt-2">Total Storage: <strong>{format.storage(storage.size)}</strong></p>
	{/if}
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
