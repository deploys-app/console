import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const projectInfo = await api.invoke('project.get', { project }, fetch)
	if (!projectInfo.ok) {
		throw error(500, `project: ${projectInfo.error.message}`)
	}

	return {
		projectInfo: projectInfo.result
	}
}
