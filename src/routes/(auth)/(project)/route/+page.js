import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		/** @type {Promise<import('$types').ApiResponse<import('$types').List<import('$types').Route>>>} */
		routes: api.invoke('route.list', { project }, fetch)
	}
}
