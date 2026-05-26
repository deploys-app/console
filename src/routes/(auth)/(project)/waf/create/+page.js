import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project, locations } = await parent()

	// No "list zones" endpoint — fan out waf.get to discover which locations are
	// already configured, then offer only the unconfigured ones for create.
	const configured = await Promise.all(
		locations.map(async (/** @type {Api.Location} */ loc) => {
			/** @type {Api.Response<Api.WafZone>} */
			const res = await api.invoke('waf.get', { project, location: loc.id }, fetch)
			return res.ok && res.result ? loc.id : null
		})
	)
	const configuredSet = configured.filter((id) => id != null)

	const available = locations.filter(
		(/** @type {Api.Location} */ loc) => !configuredSet.includes(loc.id)
	)

	return { project, locations: available }
}
