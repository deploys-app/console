import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, fetch }) => {
	const project = url.searchParams.get('project')

	let projectInfo: Api.Response<Api.Project> | null = null
	if (project) {
		projectInfo = await api.invoke<Api.Project>('project.get', { project }, fetch)
		if (!projectInfo.ok) {
			if (projectInfo.error?.notFound) redirect(302, '/project')
			error(500, projectInfo.error?.message)
		}
	}

	const billingAccounts = await api.invoke<Api.List<Api.BillingAccount>>('billing.list', {}, fetch)
	if (!billingAccounts.ok) error(500, billingAccounts.error?.message)

	return {
		project: projectInfo?.result,
		billingAccounts: billingAccounts.result?.items ?? []
	}
}
