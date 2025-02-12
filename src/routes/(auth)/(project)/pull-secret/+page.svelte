<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const pullSecrets = $derived(data.pullSecrets)
	const error = $derived(data.error)
</script>

<h6>Pull Secrets</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/pull-secret/create?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
			<tr>
				<th>Name</th>
				<th>Location</th>
				<th>Created at</th>
				<th>Created by</th>
			</tr>
			</thead>
			<tbody>
				{#each pullSecrets as it (`${it.name}-${it.location}`)}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="nm-link" href="/pull-secret/detail?project={project}&location={it.location}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={pullSecrets} />
				<ErrorRow span={4} {error} />
			</tbody>
		</table>
	</div>
</div>
