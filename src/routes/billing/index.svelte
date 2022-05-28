<script context="module">
	import api from '$lib/api'

	export async function load ({ fetch }) {
		const billingAccounts = await api.invoke('billing.list', {}, fetch)
		if (!billingAccounts.ok) {
			return {
				status: 500,
				error: `billingAccounts: ${billingAccounts.error.message}`
			}
		}
		return {
			props: {
				billingAccounts: billingAccounts.result.items || []
			}
		}
	}
</script>

<script>
	import NoDataRow from '../../lib/components/NoDataRow.svelte'

	export let billingAccounts
</script>

<h6>Billing</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href="/billing/create">
                Create account
            </a>
		</div>
	</div>
	<br>
	<div class="moon-table-container">
		<table class="moon-table -ruled">
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
						<a class="moon-link" href={`/billing/detail?id=${it.id}`}>{it.name}</a>
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
