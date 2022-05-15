<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'

	let list = null

	$: {
		$project
		reloadList()
	}

	async function reloadList () {
		const result = await api.serviceAccount.list({ project: $project })
		list = result.serviceAccounts
	}
</script>

<h6>Service Accounts</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/service-account/create?project=${$project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Email</th>
				<th>Name</th>
				<th>Created At</th>
				<th class="collapsed _tal-r"></th>
			</tr>
			</thead>
			<tbody>
			{#if list == null}
				<LoadingRow span="4" />
			{:else}
				{#each list as it}
					<tr>
						<td>
							<a class="moon-link" href={`/service-account/detail?project=${$project}&id=${it.sid}`}>
								{it.email}
							</a>
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<div class="table-action-container">
								<a href={`/service-account/create?project=${$project}&id=${it.sid}`}>
									<div class="moon-icon-button -secondary">
										<i class="fas fa-pen"></i>
									</div>
								</a>
							</div>
						</td>
					</tr>
				{:else}
					<NoDataRow span="4" />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
