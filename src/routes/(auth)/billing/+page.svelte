<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccounts = $derived(data.billingAccounts)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Billing</strong></h4>
		<p class="page-sub">{billingAccounts.length} {billingAccounts.length === 1 ? 'account' : 'accounts'}</p>
	</div>
	<a class="button is-icon-left" href="/billing/create">
		<i class="fa-solid fa-plus"></i>
		Create account
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
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
