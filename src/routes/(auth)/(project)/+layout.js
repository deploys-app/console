import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import { browser } from '$app/environment'

/**
 * @typedef {Object} BrowserCache
 * @property {string} project
 * @property {Api.Project} projectInfo
 * @property {Api.Location[]} locations
 */

/** @type {BrowserCache | null} */
let browserCache = null

export async function load ({ url, data, fetch }) {
	const project = url.searchParams.get('project')
	const { restoreProject } = data || {}

	if (!project && restoreProject) {
		const q = new URLSearchParams(url.search)
		q.set('project', restoreProject)
		redirect(302, `?${q.toString()}`)
	}
	if (!project) redirect(302, '/project')

	if (browser && browserCache?.project === project) {
		return {
			project,
			projectInfo: browserCache.projectInfo,
			locations: browserCache.locations
		}
	}

	/** @type {Api.Response<Api.Project>} */
	const projectInfo = await api.invoke('project.get', { project }, fetch)
	if (!projectInfo.ok) {
		// not allow to access if user don't have permission 'project.get'
		if (projectInfo.error?.forbidden || projectInfo.error?.notFound) {
			redirect(302, '/project')
		}
		error(500, `project: ${projectInfo.error?.message}`)
	}
	if (!projectInfo.result) redirect(302, '/project')

	/** @type {Api.Response<Api.List<Api.Location>>} */
	const locations = await api.invoke('location.list', { project }, fetch)
	if (!locations.ok) error(500, `locations: ${locations.error?.message}`)
	if (!locations.result) redirect(302, '/project')

	if (browser) {
		browserCache = {
			project,
			projectInfo: projectInfo.result,
			locations: locations.result.items ?? []
		}
	}

	return {
		project,
		projectInfo: projectInfo.result,
		locations: locations.result.items ?? []
	}
}
