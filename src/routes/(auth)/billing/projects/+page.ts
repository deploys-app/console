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

	const [projects, mine] = await Promise.all([
		api.invoke<Api.List<Api.BillingBoundProject>>('billing.listProjects', { id }, fetch),
		api.invoke<Api.List<Api.Project>>('project.list', {}, fetch)
	])

	// project.list is only the caller's own projects. A billing member can see
	// every project the account pays for, but can open only the ones they belong to.
	const openable = new Set((mine.result?.items ?? []).map((p) => p.project))

	return {
		billingAccount: billingAccount.result,
		projects: (projects.result?.items ?? []).map((p) => ({
			...p,
			canOpen: openable.has(p.project)
		})),
		error: projects.error
	}
}
