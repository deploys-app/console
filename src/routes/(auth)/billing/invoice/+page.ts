import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, fetch }) => {
	const id = url.searchParams.get('id')
	if (!id) redirect(302, '/billing')

	const invoice = await api.invoke<Api.Invoice>('billing.getInvoice', { invoiceId: id }, fetch)
	if (!invoice.ok) {
		if (invoice.error?.notFound) redirect(302, '/billing')
		error(500, invoice.error?.message)
	}
	if (!invoice.result) redirect(302, '/billing')

	const billingAccount = await api.invoke<Api.BillingAccount>('billing.get', { id: invoice.result.billingAccountId }, fetch)
	if (!billingAccount.ok || !billingAccount.result) {
		redirect(302, '/billing')
	}

	return {
		invoice: invoice.result,
		billingAccount: billingAccount.result
	}
}
