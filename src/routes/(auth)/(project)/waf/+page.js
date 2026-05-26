import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project, locations } = await parent()

	// Preserve the selected location across navigation (e.g. returning from the
	// edit page) via the URL, falling back to the first location.
	const location = url.searchParams.get('location') ?? locations[0]?.id ?? ''
	if (!location) {
		return { location: '', zone: null, error: null }
	}

	/** @type {Api.Response<Api.WafZone>} */
	const res = await api.invoke('waf.get', { project, location }, fetch)
	// A missing zone is the normal "firewall not configured yet" state — render
	// an empty list instead of an error screen. Surface anything else.
	return {
		location,
		zone: res.result ?? null,
		error: res.error?.notFound ? null : res.error
	}
}
