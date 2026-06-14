import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const links = await api.invoke('github.list', { project }, fetch)

	return {
		links: links.result?.items ?? [],
		error: links.error
	}
}
