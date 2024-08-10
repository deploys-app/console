<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project
	$: serviceAccounts = data.serviceAccounts
	$: error = data.error
</script>

<h6>Service Accounts</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/service-account/create?project={project}">
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
				{#each serviceAccounts as it (it.email)}
					<tr>
						<td>
							<a class="nm-link" href="/service-account/detail?project={project}&id={it.sid}">
								{it.email}
							</a>
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<a href="/service-account/create?project={project}&id={it.sid}">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</a>
						</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={serviceAccounts} />
				<ErrorRow span={4} {error} />
			</tbody>
		</table>
	</div>
</div>
