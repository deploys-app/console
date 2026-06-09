<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const envGroups = $derived(data.envGroups)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Env Groups</strong></h4>
		<p class="page-sub">{envGroups.length} {envGroups.length === 1 ? 'env group' : 'env groups'}</p>
	</div>
	<a class="button is-icon-left" href="/env-group/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
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
							<a class="link cell-name" href="/env-group/detail?project={project}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td><span class="count-pill"><i class="fa-solid fa-list" aria-hidden="true"></i>{Object.keys(it.env ?? {}).length}</span></td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td><span class="cell-muted">{it.createdBy}</span></td>
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
