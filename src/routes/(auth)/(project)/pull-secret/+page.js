import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').PullSecret>>} */
	const pullSecrets = await api.invoke('pullSecret.list', { project }, fetch)
	if (!pullSecrets.ok && !pullSecrets.error.forbidden) {
		throw error(500, `pullSecrets: ${pullSecrets.error.message}`)
	}

	return {
		permission: {
			pullSecrets: !pullSecrets.error?.forbidden
		},
		pullSecrets: pullSecrets.result?.items || []
	}
}
