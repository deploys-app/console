import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.EmailDomain>>} */
	const res = await api.invoke('email.list', { project }, fetch)
	return {
		domains: res.result?.items ?? [],
		error: res.error
	}
}
