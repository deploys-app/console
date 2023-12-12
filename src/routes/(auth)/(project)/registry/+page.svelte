<script>
	export let data

	$: project = data.project
	$: repositories = data.repositories
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
				{#each repositories as repo}
					<tr>
						<td>
							<a class="nm-link"
							   href="/registry/detail?project={project}&repository={repo.name}">
								{repo.name}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
