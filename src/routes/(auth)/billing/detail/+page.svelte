<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: billingAccount = data.billingAccount

	function deleteItem () {
		modal.confirm({
			title: `Delete "${billingAccount.name}" ?`,
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

<div class="nm-panel is-level-300 _dp-g _g-6">
	<div class="lo-12 _g-5">
		<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>"{billingAccount.name}" account information</strong></h3>
	</div>

	<hr>

	<div class="content _dp-g _g-6 _w-100pct">
		<div class="nm-table-container _mgt-6">
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

		<div class="_dp-f _g-6">
			<a class="nm-button" href={`/billing/create?id=${billingAccount.id}`}>Edit</a>
			<a class="nm-button" href={`/billing/report?id=${billingAccount.id}`}>Report</a>
			<button class="nm-button" type="button" on:click={deleteItem}>Delete account</button>
		</div>
	</div>
</div>
