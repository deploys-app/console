import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.ServiceAccount>>} */
	const res = await api.invoke('serviceAccount.list', { project }, fetch)
	return {
		serviceAccounts: res.result?.items ?? [],
		error: res.error
	}
}
