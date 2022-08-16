<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	export let data
	$: ({ billingAccounts } = data)
</script>

<h6>Billing</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href="/billing/create">
                Create account
            </a>
		</div>
	</div>
	<br>
	<div class="table-container">
		<table class="table -ruled">
			<thead>
				<tr>
					<th>Billing name</th>
					<th>Billing ID</th>
				</tr>
			</thead>
			<tbody>
			{#each billingAccounts as it}
				<tr>
					<td>
						<a sveltekit:prefetch class="link" href={`/billing/detail?id=${it.id}`}>{it.name}</a>
					</td>
					<td>{it.id}</td>
				</tr>
			{:else}
				<NoDataRow span="2" />
			{/each}
			</tbody>
		</table>
	</div>
</div>
