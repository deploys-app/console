<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data
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
				{#await data.billingAccounts}
					<LoadingRow span={3} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it (it.id)}
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
						{:else}
							<NoDataRow span={3} />
						{/each}
					{:else}
						<ErrorRow span={3} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={3} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
