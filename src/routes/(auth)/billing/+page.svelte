<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const billingAccounts = $derived(data.billingAccounts)
	const error = $derived(data.error)
</script>

<h6>Billing</h6>
<br>
<div class="panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			<a class="button" href="/billing/create">
                Create account
            </a>
		</div>
	</div>
	<br>
	<div class="table-container mt-4">
		<table class="table">
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
							<a class="link" href="/billing/detail?id={it.id}">{it.name}</a>
						</td>
						<td>{it.id}</td>
						<td class="is-align-center">
							{#if it.active}
								<i class="fa-solid fa-check-circle text-positive text-content/80"></i>
							{:else}
								<i class="fa-solid fa-times text-negative text-content/80"></i>
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
