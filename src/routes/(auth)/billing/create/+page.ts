import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, fetch }) => {
	const id = url.searchParams.get('id')

	let billingAccount: Api.BillingAccount | null = null
	if (id) {
		const res = await api.invoke<Api.BillingAccount>('billing.get', { id }, fetch)
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
