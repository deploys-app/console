import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.PullSecret>>} */
	const res = await api.invoke('pullSecret.list', { project }, fetch)
	return {
		pullSecrets: res.result?.items ?? [],
		error: res.error
	}
}
