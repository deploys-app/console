<script>
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'

	let list = null

	project.subscribe(async () => {
		list = await api.disk.list({ project: $project })
	})
</script>

<h6>Disks</h6>

<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/disk/create?project=${$project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table">
			<thead>
			<tr>
				<th>Disk name</th>
				<th>Size</th>
				<th>Location</th>
				<th>Created at</th>
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<tr>
					<td colspan="5" class="_tal-ct">Loading...</td>
				</tr>
			{:else}
				{#each list as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a class="moon-link" href={`/disk/detail?project=${$project}&location=${it.location}&name=${it.name}`}>
								{it.name}
							</a>
						</td>
						<td>{it.size} GiB</td>
						<td>{it.location}</td>
						<td>{format.datetime(it.createdAt)}}</td>
						<td>
							<a href={`/disk/create?project=${$project}&location=${it.location}&name=${it.name}`}>
								<div class="moon-icon-button -secondary">
									<i class="fas fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="_tal-ct">No data</td>
					</tr>
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
