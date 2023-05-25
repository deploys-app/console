<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import { loading } from '$lib/stores'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: serviceAccounts = data.serviceAccounts
</script>

<h6>Service Accounts</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="button -small" href={`/service-account/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
			<tr>
				<th>Email</th>
				<th>Name</th>
				<th>Created At</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span={4} />
			{:else}
				{#each serviceAccounts as it}
					<tr>
						<td>
							<a class="link" href={`/service-account/detail?project=${project}&id=${it.sid}`}>
								{it.email}
							</a>
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<a href={`/service-account/create?project=${project}&id=${it.sid}`}>
								<div class="icon-button -secondary">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{:else}
					<NoDataRow span={4} forbidden={!permission.serviceAccounts} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
