import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [locations, projectInfo] = await Promise.all([
		api.invoke('location.list', { project }, fetch),
		api.invoke('project.get', { project }, fetch)
	])

	if (!locations.ok) {
		throw error(500, `locations: ${locations.error.message}`)
	}
	if (!projectInfo.ok) {
		throw error(500, `project: ${project.error.message}`)
	}

	return {
		project,
		locations: locations.result.items || [],
		projectInfo: projectInfo.result
	}
}
