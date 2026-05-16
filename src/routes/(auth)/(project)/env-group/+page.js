import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.EnvGroup>>} */
	const res = await api.invoke('envGroup.list', { project }, fetch)
	return {
		envGroups: res.result?.items ?? [],
		error: res.error
	}
}
