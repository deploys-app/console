import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const res = await api.invoke('domain.list', { project }, fetch)
	return {
		domains: res.result?.items ?? [],
		error: res.error
	}
}
