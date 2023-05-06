import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

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

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Location>>} */
	const locations = await api.invoke('location.list', { project }, fetch)
	if (!locations.ok) {
		if (locations.error.notFound) {
			throw redirect(302, '/project')
		}
		throw error(500, `locations: ${locations.error.message}`)
	}

	return {
		project,
		locations: locations.result.items || []
	}
}
