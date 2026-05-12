import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const id = url.searchParams.get('id')

	const billingAccount = await api.invoke('billing.get', { id }, fetch)
	if (!billingAccount.ok) {
		if (billingAccount.error?.notFound) redirect(302, '/billing')
		error(500, billingAccount.error?.message)
	}
	if (!billingAccount.result) redirect(302, '/billing')

	return {
		billingAccount: billingAccount?.result
	}
}
