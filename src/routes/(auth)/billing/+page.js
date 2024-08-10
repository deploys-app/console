import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {Api.Response<Api.List<Api.BillingAccount>>} */
	const res = await api.invoke('billing.list', {}, fetch)
	return {
		billingAccounts: res.result?.items ?? [],
		error: res.error
	}
}
