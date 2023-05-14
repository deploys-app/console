import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const id = url.searchParams.get('id')

	let billingAccount = null
	if (id) {
		/** @type {import('$types').ApiResponse<import('$types').BillingAccount>} */
		const res = await api.invoke('billing.get', { id }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) {
				throw redirect(302, '/billing')
			}
			throw error(500, `billingAccount: ${res.error?.message}`)
		}
		if (!res.result) throw redirect(302, '/billing')

		billingAccount = res.result
	}

	return {
		billingAccount
	}
}
