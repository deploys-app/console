import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project, locations } = await parent()

	const location = locations[0]?.id ?? ''
	if (!location) {
		return { location: '', zone: null, error: null }
	}

	/** @type {Api.Response<Api.WafZone>} */
	const res = await api.invoke('waf.get', { project, location }, fetch)
	// A missing zone is the normal "firewall not configured yet" state — render
	// an empty editor instead of an error screen. Surface anything else.
	return {
		location,
		zone: res.result ?? null,
		error: res.error?.notFound ? null : res.error
	}
}
