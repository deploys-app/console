<script>
	import { onMount } from 'svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project

	/** @type {MaybePromise<Api.Response<Api.List<Api.Disk>>>} */
	let disks = data.disks

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('disk.list')
		const res = await data.disks
		if (!res.ok) {
			return
		}
		disks = res
		if (!res.result.items?.some((x) => x.status === 'pending')) {
			return 300000
		}
	}, 4000))
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
				{#await disks}
					<LoadingRow span={5} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it (`${it.name}-${it.location}`)}
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
									<a href="/disk/create?project={project}&location={it.location}&name={it.name}">
										<div class="icon-button">
											<i class="fa-solid fa-pen"></i>
										</div>
									</a>
								</td>
							</tr>
						{:else}
							<NoDataRow span={5} />
						{/each}
					{:else}
						<ErrorRow span={5} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={5} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
