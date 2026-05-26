import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''

	if (!location) {
		redirect(302, `/waf?project=${project}`)
	}

	/** @type {Api.Response<Api.WafZone>} */
	const res = await api.invoke('waf.get', { project, location }, fetch)
	// You only reach manage for a configured location — a missing zone means the
	// firewall isn't configured here, so send the user back to the index.
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/waf?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/waf?project=${project}`)

	return {
		project,
		location,
		zone: res.result
	}
}
