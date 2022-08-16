import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [domains, projectInfo] = await Promise.all([
		api.invoke('domain.list', { project }, fetch),
		api.invoke('project.get', { project }, fetch)
	])
	if (!domains.ok && !domains.error.forbidden) {
		throw error(500, `domains: ${domains.error.message}`);
	}
	if (!projectInfo.ok) {
		throw error(500, `project: ${project.error.message}`);
	}

	return {
		project,
		permission: {
			domains: !domains.error?.forbidden
		},
		domains: domains.result,
		projectInfo: projectInfo.result
	}
}
