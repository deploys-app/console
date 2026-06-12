import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [links, locations] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('location.list', { project }, fetch)
	])

	return {
		links: links.result?.items ?? [],
		locations: locations.result?.items ?? [],
		error: links.error
	}
}
