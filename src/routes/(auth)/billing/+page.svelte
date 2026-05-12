<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const billingAccounts = $derived(data.billingAccounts)
	const error = $derived(data.error)
</script>

<h6>Billing</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/billing/create">
                Create account
            </a>
		</div>
	</div>
	<br>
	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
				<tr>
					<th>Billing name</th>
					<th>Billing ID</th>
					<th class="is-align-center">Active</th>
				</tr>
			</thead>
			<tbody>
				{#each billingAccounts as it (it.id)}
					<tr>
						<td>
							<a class="nm-link" href="/billing/detail?id={it.id}">{it.name}</a>
						</td>
						<td>{it.id}</td>
						<td class="is-align-center">
							{#if it.active}
								<i class="fa-solid fa-check-circle _cl-positive _cl-opacity-80"></i>
							{:else}
								<i class="fa-solid fa-times _cl-negative _cl-opacity-80"></i>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={billingAccounts} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
