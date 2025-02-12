<script>
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const disks = $derived(data.disks)
	const error = $derived(data.error)
</script>

<h6>Disks</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/disk/create?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
			<tr>
				<th>Disk name</th>
				<th>Size</th>
				<th>Location</th>
				<th>Created at</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each disks as it (`${it.name}-${it.location}`)}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="nm-link" href="/disk/metrics?project={project}&location={it.location}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td>{it.size} GiB</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<a href="/disk/create?project={project}&location={it.location}&name={it.name}" aria-label="Edit">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={disks} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
