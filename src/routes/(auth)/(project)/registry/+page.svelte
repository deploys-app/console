<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project
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
				{#await data.repositories}
					<LoadingRow span={1} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as repo}
							<tr>
								<td>
									<a class="nm-link"
									   href="/registry/detail?project={project}&repository={repo.name}">
										{repo.name}
									</a>
								</td>
							</tr>
						{/each}
					{:else}
						<ErrorRow span={1} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={1} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
