<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const envGroups = $derived(data.envGroups)
	const error = $derived(data.error)
</script>

<h6>Env Groups</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			<a class="nm-button" href="/env-group/create?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container mt-4">
		<table class="nm-table is-variant-compact">
			<thead>
			<tr>
				<th>Name</th>
				<th>Variables</th>
				<th>Created at</th>
				<th>Created by</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each envGroups as it (it.name)}
					<tr>
						<td>
							<a class="nm-link" href="/env-group/create?project={project}&name={it.name}">
								<strong>{it.name}</strong>
							</a>
						</td>
						<td>{Object.keys(it.env ?? {}).length}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
						<td>
							<a href="/env-group/create?project={project}&name={it.name}" aria-label="Edit">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={envGroups} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
