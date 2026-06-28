import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, fetch }) => {
	const id = url.searchParams.get('id')
	if (!id) redirect(302, '/billing')

	const billingAccount = await api.invoke<Api.BillingAccount>('billing.get', { id }, fetch)
	if (!billingAccount.ok) {
		if (billingAccount.error?.notFound) redirect(302, '/billing')
		error(500, billingAccount.error?.message)
	}
	if (!billingAccount.result) redirect(302, '/billing')

	const invoices = await api.invoke<Api.List<Api.InvoiceListItem>>('billing.listInvoices', { billingAccountId: id }, fetch)

	return {
		billingAccount: billingAccount.result,
		invoices: invoices.result?.items ?? [],
		error: invoices.error
	}
}
