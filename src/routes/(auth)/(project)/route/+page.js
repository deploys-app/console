import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.Route>>} */
	const res = await api.invoke('route.list', { project }, fetch)
	return {
		routes: res.result?.items ?? [],
		error: res.error
	}
}
