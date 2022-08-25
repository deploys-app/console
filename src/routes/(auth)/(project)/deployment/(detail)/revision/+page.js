import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const {
		project,
		location,
		name,
		deployment
	} = await parent()

	const revisions = await api.invoke('deployment.revisions', { project, location, name }, fetch)
	if (!revisions.ok) {
		throw error(500, `revisions: ${revisions.error.message}`)
	}

	return {
		deployment,
		revisions: revisions.result.items || []
	}
}
