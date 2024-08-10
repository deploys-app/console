import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.Deployment>>} */
	const res = await api.invoke('deployment.list', { project }, fetch)
	return {
		deployments: res.result?.items ?? [],
		error: res.error
	}
}
