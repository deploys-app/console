import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.Repository>>} */
	const res = await api.invoke('registry/list', { project }, fetch)
	return {
		repositories: res.result?.items ?? [],
		error: res.error
	}
}
