import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		/** @type {Promise<Api.Response<Api.List<Api.Role>>>} */
		roles: api.invoke('role.list', { project }, fetch)
	}
}
