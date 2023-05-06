import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const projectInfo = await api.invoke('project.get', { project }, fetch)
	if (!projectInfo.ok) {
		throw error(500, `project: ${project.error.message}`)
	}

	let deployment
	if (location && name) {
		deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error.notFound) {
				throw redirect(302, `/deployment?project=${project}`)
			}
			throw error(500, `deployment: ${deployment.error.message}`)
		}
	}
	return {
		quota: projectInfo.result.quota || {},
		deployment: deployment?.result
	}
}
