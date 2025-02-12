<script>
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	let { data } = $props()

	let project = $derived(data.project)
	let repositories = $derived(data.repositories)
	let error = $derived(data.error)
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
					</tr>
				{/each}
				<NoDataRow span={1} list={repositories} />
				<ErrorRow span={1} {error} />
			</tbody>
		</table>
	</div>
</div>
