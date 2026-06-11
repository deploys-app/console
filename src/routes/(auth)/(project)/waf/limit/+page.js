import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''
	const limitId = url.searchParams.get('limit')

	if (!location) {
		redirect(302, `/waf?project=${project}`)
	}

	const manageUrl = `/waf/manage?project=${project}&location=${encodeURIComponent(location)}`

	/** @type {Api.Response<Api.WafZone>} */
	const res = await api.invoke('waf.get', { project, location }, fetch)
	// A missing zone is the normal "firewall not configured yet" state — render
	// an empty editor (create mode). Surface anything else.
	if (!res.ok && !res.error?.notFound) {
		error(500, res.error?.message)
	}
	const zone = res.result ?? null

	// Editing a specific limit requires its zone + limit to exist; otherwise
	// send the user back to the list for this location.
	if (limitId) {
		const found = zone?.limits?.some((l) => l.id === limitId)
		if (!found) {
			redirect(302, manageUrl)
		}
	}

	return {
		project,
		location,
		limitId,
		zone
	}
}
