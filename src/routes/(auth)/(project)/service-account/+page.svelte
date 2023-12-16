<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project
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
				{#await data.serviceAccounts}
					<LoadingRow span={4} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it}
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
						{:else}
							<NoDataRow span={4} />
						{/each}
					{:else}
						<ErrorRow span={4} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={4} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
