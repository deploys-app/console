import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.CacheZoneList>} */
	const res = await api.invoke('cache.list', { project }, fetch)

	return {
		project,
		zones: res.result?.items ?? [],
		error: res.error
	}
}
