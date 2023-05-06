<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	export let data

	$: billingAccounts = data.billingAccounts
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
					<th class="collapse _tal-ct">Active</th>
				</tr>
			</thead>
			<tbody>
			{#each billingAccounts as it}
				<tr>
					<td>
						<a class="link" href={`/billing/detail?id=${it.id}`}>{it.name}</a>
					</td>
					<td>{it.id}</td>
					<td class="_tal-ct">
						{#if it.active}
							<i class="fa-solid fa-check-circle _cl-positive-500"></i>
						{:else}
							<i class="fa-solid fa-times _cl-negative-500"></i>
						{/if}
					</td>
				</tr>
			{:else}
				<NoDataRow span={3} />
			{/each}
			</tbody>
		</table>
	</div>
</div>
