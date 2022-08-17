import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const pullSecrets = await api.invoke('pullSecret.list', { project }, fetch)
	if (!pullSecrets.ok && !pullSecrets.error.forbidden) {
		throw error(500, `pullSecrets: ${pullSecrets.error.message}`)
	}
	return {
		project,
		permission: {
			pullSecrets: !pullSecrets.error?.forbidden
		},
		pullSecrets: pullSecrets.result?.items || []
	}
}
