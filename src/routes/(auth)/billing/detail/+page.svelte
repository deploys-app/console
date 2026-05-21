<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const billingAccount = $derived(data.billingAccount)

	function deleteItem () {
		modal.confirm({
			title: `Delete "${billingAccount.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('billing.delete', { id: billingAccount.id }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto('/billing')
			}
		})
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href="/billing" class="nm-link"><h6>Billing</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{billingAccount.name}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 grid gap-4">
	<div class="grid grid-cols-1 gap-3">
		<h3 class="mr-6 mb-4 xl:mb-0"><strong>"{billingAccount.name}" account information</strong></h3>
	</div>

	<hr>

	<div class="content grid gap-4 w-full">
		<div class="nm-table-container mt-4">
			<table class="nm-table" style="--table-data-border-color: none">
				<tbody>
				<tr>
					<td>Account name</td>
					<td>{billingAccount.name}</td>
				</tr>
				<tr>
					<td>Tax ID</td>
					<td>{billingAccount.taxId}</td>
				</tr>
				<tr>
					<td>Name</td>
					<td>{billingAccount.taxName}</td>
				</tr>
				<tr>
					<td>Address</td>
					<td>{billingAccount.taxAddress}</td>
				</tr>
				</tbody>
			</table>
		</div>

		<div class="flex gap-4">
			<a class="nm-button" href={`/billing/create?id=${billingAccount.id}`}>Edit</a>
			<a class="nm-button" href={`/billing/report?id=${billingAccount.id}`}>Report</a>
			<button class="nm-button" type="button" onclick={deleteItem}>Delete account</button>
		</div>
	</div>
</div>
