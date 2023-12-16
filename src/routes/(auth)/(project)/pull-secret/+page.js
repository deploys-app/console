import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		/** @type {Promise<Api.Response<Api.List<Api.PullSecret>>>} */
		pullSecrets: api.invoke('pullSecret.list', { project }, fetch)
	}
}
