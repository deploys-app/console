import api from '$lib/api'

export async function load ({ fetch }) {
	return {
		/** @type {Promise<Api.Response<Api.List<Api.BillingAccount>>>} */
		billingAccounts: api.invoke('billing.list', {}, fetch)
	}
}
