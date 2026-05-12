import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const id = url.searchParams.get('id')

	let billingAccount = null
	if (id) {
		/** @type {Api.Response<Api.BillingAccount>} */
		const res = await api.invoke('billing.get', { id }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) redirect(302, '/billing')
			error(500, res.error?.message)
		}
		if (!res.result) redirect(302, '/billing')

		billingAccount = res.result
	}

	return {
		billingAccount
	}
}
