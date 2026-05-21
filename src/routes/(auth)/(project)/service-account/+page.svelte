<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const serviceAccounts = $derived(data.serviceAccounts)
	const error = $derived(data.error)
</script>

<h6>Service Accounts</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			<a class="nm-button" href="/service-account/create?project={project}">
				Create
			</a>
		</div>
	</div>

	<div class="nm-table-container mt-4">
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
							<a href="/service-account/create?project={project}&id={it.sid}" aria-label="Edit">
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
