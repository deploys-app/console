import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''

	if (!location) {
		redirect(302, `/cache?project=${project}`)
	}

	/** @type {Api.Response<Api.CacheZone>} */
	const res = await api.invoke('cache.get', { project, location }, fetch)
	// You only reach manage for a configured location — a missing zone means
	// cache isn't configured here, so send the user back to the index.
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/cache?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/cache?project=${project}`)

	return {
		project,
		location,
		zone: res.result
	}
}
