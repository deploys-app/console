import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''
	const domain = url.searchParams.get('domain') ?? ''
	const path = url.searchParams.get('path') ?? ''

	// A route is identified by location + domain + path; without the first two
	// there's nothing to edit, so send the user back to the list.
	if (!location || !domain) {
		redirect(302, `/route?project=${project}`)
	}

	/** @type {Api.Response<Api.Route>} */
	const res = await api.invoke('route.get', { project, location, domain, path }, fetch)
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/route?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/route?project=${project}`)

	return {
		project,
		route: res.result
	}
}
