import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.Role>>} */
	const res = await api.invoke('role.list', { project }, fetch)
	return {
		roles: res.result?.items ?? [],
		error: res.error
	}
}
