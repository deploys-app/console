import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		/** @type {Promise<Api.Response<Api.List<Api.Repository>>>} */
		repositories: api.invoke('registry/list', { project }, fetch)
	}
}
