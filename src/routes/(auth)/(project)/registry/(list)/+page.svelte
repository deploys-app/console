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
<div class="panel is-level-300">
	<div class="table-container">
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
