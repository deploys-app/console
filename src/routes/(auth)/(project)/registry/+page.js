import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		repositories: api.invoke('registry/list', { project }, fetch)
	}
}
