import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Route>>} */
	const routes = await api.invoke('route.list', { project }, fetch)
	if (!routes.ok && !routes.error.forbidden) {
		throw error(500, `routes: ${routes.error.message}`)
	}

	return {
		permission: {
			routes: !routes.error?.forbidden
		},
		routes: routes.result.items || []
	}
}
