import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const project = url.searchParams.get('project')

	/** @type {Api.Response<Api.Project> | null} */
	let projectInfo = null
	if (project) {
		projectInfo = await api.invoke('project.get', { project }, fetch)
		if (!projectInfo.ok) {
			if (projectInfo.error?.notFound) redirect(302, '/project')
			error(500, projectInfo.error?.message)
		}
	}

	/** @type {Api.Response<Api.List<Api.BillingAccount>>} */
	const billingAccounts = await api.invoke('billing.list', {}, fetch)
	if (!billingAccounts.ok) error(500, billingAccounts.error?.message)

	return {
		project: projectInfo?.result,
		billingAccounts: billingAccounts.result?.items ?? []
	}
}
