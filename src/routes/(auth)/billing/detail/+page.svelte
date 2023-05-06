<script>
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	/** @type {import('$types').BillingAccount} */
	let billingAccount
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

<div>
	<ul class="breadcrumb">
		<li>
			<a href="/billing" class="link"><h6>Billing</h6></a>
		</li>
		<li>
			<h6>{billingAccount.name}</h6>
		</li>
	</ul>
</div>

<br>

<div class="panel _dp-g _gg-16px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>"{billingAccount.name}" account information</strong></h3>
			<div class="_dp-f">
				<button class="button -small -negative -tertiary" type="button" on:click={deleteItem}>Delete account</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="table-container _mgbt-30px">
			<table class="table">
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

		<a class="button _mgr-at" href={`/billing/create?id=${billingAccount.id}`}>Edit</a>
		<a class="button _mgr-at" href={`/billing/report?id=${billingAccount.id}`}>Report</a>
	</div>
</div>
