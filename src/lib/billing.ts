/**
 * Billing-account role helpers.
 *
 * Billing is authorized by account ownership/membership, NOT project IAM, so
 * these gates read the caller's effective `role` off the loaded account
 * (billing.get / billing.list return it) rather than `me.permissions`.
 */

export const billingRoleLabel: Record<string, string> = {
	owner: 'Owner',
	admin: 'Admin',
	accountant: 'Accountant'
}

/** Short, human description of what a role can do (shown in the members UI). */
export const billingRoleDescription: Record<string, string> = {
	owner: 'Full control, including deleting the account and managing members.',
	admin: 'Co-manage: view & pay invoices, edit tax details, and manage members.',
	accountant: 'View invoices & receipts, view usage, and pay. No account changes.'
}

/** Owner or admin: may edit tax details and manage members. */
export function canManageBilling (role?: string): boolean {
	return role === 'owner' || role === 'admin'
}

/** Owner only: may delete the account. */
export function canDeleteBilling (role?: string): boolean {
	return role === 'owner'
}

/** Issued and still owing: open, or pending while a slip awaits review. */
export function isInvoiceUnpaid (status?: Api.InvoiceStatus): boolean {
	return status === 'open' || status === 'pending'
}

// Invoices are issued on the 1st for the previous month. Payment is due at
// the first UTC instant of the month after issue. A 1 Jun invoice is overdue
// from 1 Jul. Six months past that due date, the project is paused.
const PAUSE_AFTER_OVERDUE_MONTHS = 6
const OVERDUE_ALERT_COUNT = 3

export interface InvoiceDashboardNotice {
	tone: 'warning' | 'alert'
	title: string
	body: string
	payInvoiceId: string | null
}

function issuedMs (issuedAt: string): number | null {
	if (!issuedAt || issuedAt.startsWith('0001-01-01')) return null
	const t = Date.parse(issuedAt)
	return Number.isNaN(t) ? null : t
}

/** Due at 00:00 UTC on the 1st of the month after `issuedAt`. */
function invoiceDueMs (issuedAt: string): number | null {
	const t = issuedMs(issuedAt)
	if (t == null) return null
	const issued = new Date(t)
	return Date.UTC(issued.getUTCFullYear(), issued.getUTCMonth() + 1, 1)
}

function overdueMonths (dueMs: number, now: Date): number {
	const due = new Date(dueMs)
	return (now.getUTCFullYear() - due.getUTCFullYear()) * 12 +
		(now.getUTCMonth() - due.getUTCMonth())
}

function invoiceCount (n: number): string {
	return n === 1 ? '1 invoice is' : `${n} invoices are`
}

function pauseSentence (pausesProject: boolean): string {
	if (pausesProject) {
		return 'An invoice has been overdue for 6 months and will pause this project.'
	}
	return 'An invoice overdue for 6 months will pause this project.'
}

/**
 * Dashboard notice for unpaid invoices on the project's billing account.
 * Warning while any invoice is still unpaid; alert once more than three are
 * overdue. Null when nothing is owing.
 */
export function invoiceDashboardNotice (
	items: readonly Api.InvoiceListItem[] | null | undefined,
	now: Date = new Date()
): InvoiceDashboardNotice | null {
	const unpaid = (items ?? []).filter((it) => isInvoiceUnpaid(it.status))
	if (!unpaid.length) return null

	const awaiting: Api.InvoiceListItem[] = []
	const overdue: Api.InvoiceListItem[] = []
	let pausesProject = false
	for (const it of unpaid) {
		const due = invoiceDueMs(it.issuedAt)
		if (due == null || now.getTime() < due) {
			awaiting.push(it)
			continue
		}
		overdue.push(it)
		if (overdueMonths(due, now) >= PAUSE_AFTER_OVERDUE_MONTHS) pausesProject = true
	}

	const byIssued = (a: Api.InvoiceListItem, b: Api.InvoiceListItem) =>
		(issuedMs(a.issuedAt) ?? Number.POSITIVE_INFINITY) - (issuedMs(b.issuedAt) ?? Number.POSITIVE_INFINITY)
	overdue.sort(byIssued)
	awaiting.sort(byIssued)

	const pause = pauseSentence(pausesProject)
	const tone = overdue.length > OVERDUE_ALERT_COUNT ? 'alert' : 'warning'
	let title: string
	let body: string
	if (overdue.length > 0) {
		title = `${invoiceCount(overdue.length)} overdue`
		if (tone === 'alert') {
			body = `Pay them to keep this project running. ${pause}`
		} else if (awaiting.length) {
			body = `${invoiceCount(awaiting.length)} still awaiting payment. ${pause}`
		} else {
			body = pause
		}
	} else {
		title = `${invoiceCount(awaiting.length)} awaiting payment`
		body = pause
	}

	return {
		tone,
		title,
		body,
		payInvoiceId: (overdue[0] ?? awaiting[0])?.id ?? null
	}
}
