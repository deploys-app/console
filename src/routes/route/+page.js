import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const routes = await api.invoke('route.list', { project }, fetch)
	if (!routes.ok && !routes.error.forbidden) {
		throw error(500, `routes: ${routes.error.message}`);
	}
	return {
		project,
		permission: {
			routes: !routes.error?.forbidden
		},
		routes: routes.result
	}
}
