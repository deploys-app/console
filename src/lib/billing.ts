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
