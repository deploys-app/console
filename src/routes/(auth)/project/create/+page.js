import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, fetch }) {
	const project = url.searchParams.get('project')

	/** @type {ApiResponse<ProjectItem>} */
	let projectInfo
	if (project) {
		projectInfo = await api.invoke('project.get', { project }, fetch)
		if (!projectInfo.ok) {
			if (projectInfo.error.notFound) {
				throw redirect(302, '/project')
			}
			throw error(500, `project: ${projectInfo.error.message}`)
		}
	}

	/** @type {ApiResponse<List<BillingAccount>>} */
	const billingAccounts = await api.invoke('billing.list', {}, fetch)
	if (!billingAccounts.ok) {
		throw error(500, `billingAccounts: ${billingAccounts.error.message}`)
	}

	return {
		project: projectInfo?.result,
		billingAccounts: billingAccounts.result.items || []
	}
}
