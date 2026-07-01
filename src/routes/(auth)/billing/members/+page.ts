import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import { canManageBilling } from '$lib/billing'
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

	// Managing members is owner/admin only. An accountant who deep-links here is
	// bounced back to the account overview rather than shown a forbidden error.
	if (!canManageBilling(billingAccount.result.role)) {
		redirect(302, `/billing/detail?id=${id}`)
	}

	const members = await api.invoke<Api.BillingMemberList>('billing.listMembers', { id }, fetch)

	return {
		billingAccount: billingAccount.result,
		owner: members.result?.owner ?? '',
		members: members.result?.items ?? [],
		error: members.error
	}
}
