import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const disk = await api.invoke('disk.get', { project, location, name }, fetch)
	if (!disk.ok) {
		if (disk.error.notFound) {
			throw redirect(302, `/disk?project=${project}`)
		}
		throw error(500, `disk: ${disk.error.message}`)
	}

	return {
		location,
		name,
		disk: disk.result
	}
}
