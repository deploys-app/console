import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').BillingAccount>>} */
	const billingAccounts = await api.invoke('billing.list', {}, fetch)
	if (!billingAccounts.ok) error(500, billingAccounts.error?.message)

	return {
		billingAccounts: billingAccounts.result?.items ?? []
	}
}
