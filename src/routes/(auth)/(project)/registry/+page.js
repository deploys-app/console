import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [res, storageRes] = await Promise.all([
		/** @type {Promise<Api.Response<Api.List<Api.Repository>>>} */
		api.invoke('registry/list', { project }, fetch),
		/** @type {Promise<Api.Response<Api.ProjectStorage>>} */
		api.invoke('registry/getProjectStorage', { project }, fetch)
	])
	return {
		repositories: res.result?.items ?? [],
		error: res.error,
		storage: storageRes.result ?? null
	}
}
