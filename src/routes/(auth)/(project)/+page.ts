import api from '$lib/api'
import { invoiceDashboardNotice } from '$lib/billing'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, projectInfo } = await parent()
	const billingAccountId = projectInfo.billingAccount

	const [
		usage,
		price,
		auditLog,
		invoices
	] = await Promise.all([
		api.invoke<Api.ProjectUsage>('project.usage', { project }, fetch),
		api.invoke<Api.BillingProject>('billing.project', { project }, fetch),
		api.invoke<Api.List<Api.AuditLogItem>>('auditLog.list', { project, limit: 6 }, fetch),
		// Best-effort: project viewers who are not on the billing account get a
		// not-found/forbidden here. The dashboard still renders; it just omits
		// the invoice notice.
		billingAccountId
			? api.invoke<Api.List<Api.InvoiceListItem>>('billing.listInvoices', { billingAccountId }, fetch)
			: Promise.resolve(null)
	])
	return {
		menu: 'dashboard',
		usage: usage.result ?? ({} as Api.ProjectUsage),
		price: price.result ?? ({} as Api.BillingProject),
		auditLog: {
			items: auditLog.result?.items ?? [],
			error: auditLog.error
		},
		invoiceNotice: invoices?.ok
			? invoiceDashboardNotice(invoices.result?.items ?? [])
			: null
	}
}
