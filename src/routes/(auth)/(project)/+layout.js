import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import { browser } from '$app/environment'

/**
 * @typedef {Object} BrowserCache
 * @property {string} project
 * @property {import('$types').Project} projectInfo
 * @property {import('$types').Location[]} locations
 */

/** @type {BrowserCache | null} */
let browserCache = null

export async function load ({ url, data, fetch }) {
	const project = url.searchParams.get('project')
	const { restoreProject } = data || {}

	if (!project && restoreProject) {
		const q = new URLSearchParams(url.search)
		q.set('project', restoreProject)
		throw redirect(302, `?${q.toString()}`)
	}
	if (!project) {
		throw redirect(302, '/project')
	}

	if (browser && browserCache?.project === project) {
		return {
			project,
			projectInfo: browserCache.projectInfo,
			locations: browserCache.locations
		}
	}

	/** @type {import('$types').ApiResponse<import('$types').Project>} */
	const projectInfo = await api.invoke('project.get', { project }, fetch)
	if (!projectInfo.ok) {
		// not allow to access if user don't have permission 'project.get'
		if (projectInfo.error?.forbidden || projectInfo.error?.notFound) {
			throw redirect(302, '/project')
		}
		throw error(500, `project: ${projectInfo.error?.message}`)
	}
	if (!projectInfo.result) throw error(302, '/project')

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Location>>} */
	const locations = await api.invoke('location.list', { project }, fetch)
	if (!locations.ok) {
		throw error(500, `locations: ${locations.error?.message}`)
	}
	if (!locations.result) throw error(302, '/project')

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
