<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const serviceAccounts = $derived(data.serviceAccounts)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Service Accounts</strong></h4>
		<p class="page-sub">{serviceAccounts.length} {serviceAccounts.length === 1 ? 'service account' : 'service accounts'}</p>
	</div>
	<GuardedButton permission="serviceaccount.create" class="button is-icon-left" href="/service-account/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
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
							<a class="link cell-name" href="/service-account/detail?project={project}&id={it.sid}">
								{it.email}
							</a>
						</td>
						<td><span class="cell-muted">{it.name}</span></td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							<GuardedButton permission="serviceaccount.create" class="" href="/service-account/create?project={project}&id={it.sid}" aria-label="Edit">
								<div class="icon-button">
									<i class="fa-solid fa-pen"></i>
								</div>
							</GuardedButton>
						</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={serviceAccounts} />
				<ErrorRow span={4} {error} />
			</tbody>
		</table>
	</div>
</div>
