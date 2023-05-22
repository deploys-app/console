import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const id = url.searchParams.get('id')

	/** @type {import('$types').ApiResponse<import('$types').BillingAccount>} */
	const billingAccount = await api.invoke('billing.get', { id }, fetch)
	if (!billingAccount.ok) {
		if (billingAccount.error?.notFound) throw redirect(302, '/billing')
		throw error(500, billingAccount.error?.message)
	}
	if (!billingAccount.result) throw redirect(302, '/billing')

	return {
		billingAccount: billingAccount?.result
	}
}
