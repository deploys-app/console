<script>
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const repositories = $derived(data.repositories)
	const error = $derived(data.error)

	function deleteRepository (name) {
		modal.confirm({
			title: `Delete "${name}" ?`,
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

<h6>Registry (Alpha)</h6>
<br>
<div class="nm-panel is-level-300">
	<p>registry.deploys.app/{project}/{'{repository}'}:{'{tag}'}</p>
	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
				<tr>
					<th>Repository</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each repositories as repo (repo.name)}
					<tr>
						<td>
							<a class="nm-link"
							   href="/registry/detail?project={project}&repository={repo.name}">
								{repo.name}
							</a>
						</td>
						<td class="_ta-r">
							<button class="nm-button is-variant-negative is-size-sm" type="button"
								onclick={() => deleteRepository(repo.name)}>
								Delete
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
