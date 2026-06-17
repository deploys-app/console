import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''
	const domain = url.searchParams.get('domain') ?? ''
	const path = url.searchParams.get('path') ?? ''

	// A route is identified by location + domain + path; without the first two
	// there's nothing to look up, so send the user back to the list.
	if (!location || !domain) {
		redirect(302, `/route?project=${project}`)
	}

	const res = await api.invoke<Api.Route>('route.get', { project, location, domain, path }, fetch)
	if (!res.ok) {
		// The route was deleted (or never existed) — back to the index.
		if (res.error?.notFound) redirect(302, `/route?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/route?project=${project}`)

	return {
		project,
		route: res.result
	}
}
