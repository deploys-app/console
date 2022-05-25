<script context="module">
	import api from '$lib/api'

	export async function load ({ url, fetch }) {
		const id = url.searchParams.get('id')

		const billingAccount = await api.invoke('billing.get', { id }, fetch)
		if (!billingAccount.ok) {
			if (billingAccount.error.notFound) {
				return {
					status: 302,
					redirect: '/billing'
				}
			}
			return {
				status: 500,
				error: `billingAccount: ${billingAccount.error.message}`
			}
		}

		return {
			props: {
				billingAccount: billingAccount?.result
			}
		}
	}
</script>

<script>
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	export let billingAccount

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
	<ul class="moon-breadcrumb">
		<li>
			<a href="/billing" class="moon-link"><h6>Billing</h6></a>
		</li>
		<li>
			<h6>{billingAccount.name}</h6>
		</li>
	</ul>
</div>

<br>

<div class="moon-panel _dp-g _gg-16px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>"{billingAccount.name}" account information</strong></h3>
			<div class="_dp-f">
				<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>Delete account</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="moon-table-container _mgbt-30px">
			<table class="moon-table">
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

		<a class="moon-button _mgr-at" href={`/billing/create?id=${billingAccount.id}`}>Edit</a>
		<a class="moon-button _mgr-at" href={`/billing/report?id=${billingAccount.id}`}>Report</a>
	</div>
</div>
