import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const id = url.searchParams.get('id')

	/** @type {Api.Response<Api.Invoice>} */
	const invoice = await api.invoke('billing.getInvoice', { invoiceId: id }, fetch)
	if (!invoice.ok) {
		if (invoice.error?.notFound) redirect(302, '/billing')
		error(500, invoice.error?.message)
	}
	if (!invoice.result) redirect(302, '/billing')

	/** @type {Api.Response<Api.BillingAccount>} */
	const billingAccount = await api.invoke('billing.get', { id: invoice.result.billingAccountId }, fetch)
	if (!billingAccount.ok || !billingAccount.result) {
		redirect(302, '/billing')
	}

	return {
		invoice: invoice.result,
		billingAccount: billingAccount.result
	}
}
