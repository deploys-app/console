import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		domains: api.invoke('domain.list', { project }, fetch)
	}
}
