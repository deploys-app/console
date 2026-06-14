import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''
	const overrideId = url.searchParams.get('override')

	if (!location) {
		redirect(302, `/cache?project=${project}`)
	}

	const manageUrl = `/cache/manage?project=${project}&location=${encodeURIComponent(location)}`

	/** @type {Api.Response<Api.CacheZone>} */
	const res = await api.invoke('cache.get', { project, location }, fetch)
	// A missing zone is the normal "cache not configured yet" state — render an
	// empty editor (create mode). Surface anything else.
	if (!res.ok && !res.error?.notFound) {
		error(500, res.error?.message)
	}
	const zone = res.result ?? null

	// Editing a specific override requires its zone + override to exist;
	// otherwise send the user back to the list for this location.
	if (overrideId) {
		const found = zone?.overrides?.some((o) => o.id === overrideId)
		if (!found) {
			redirect(302, manageUrl)
		}
	}

	return {
		project,
		location,
		overrideId,
		zone
	}
}
