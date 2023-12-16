import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {Api.Response<Api.List<Api.BillingAccount>>} */
	const billingAccounts = await api.invoke('billing.list', {}, fetch)
	if (!billingAccounts.ok) error(500, billingAccounts.error?.message)

	return {
		billingAccounts: billingAccounts.result?.items ?? []
	}
}
