import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const pullSecret = await api.invoke('pullSecret.get', { project, location, name }, fetch)
	if (!pullSecret.ok) {
		if (pullSecret.error.notFound) {
			throw redirect(302, `/pull-secret?project=${project}`)
		}
		throw error(500, `pullSecret: ${pullSecret.error.message}`)
	}

	return {
		location,
		name,
		pullSecret: pullSecret.result
	}
}
