import api from '$lib/api'
import { redirect, error } from '@sveltejs/kit'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')
	const deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
	if (!deployment.ok) {
		if (deployment.error.notFound) {
			throw redirect(302, `/deployment?project=${project}`)
		}
		throw error(500, `deployment: ${deployment.error.message}`)
	}
	return {
		location,
		name,
		deployment: deployment.result
	}
}
