import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project, locations } = await parent()

	// There is no "list zones" endpoint, so we fan out waf.get per location and
	// collect the ones that resolve. A not-found location simply isn't configured.
	const results = await Promise.all(
		locations.map(async (/** @type {Api.Location} */ loc) => {
			/** @type {Api.Response<Api.WafZone>} */
			const res = await api.invoke('waf.get', { project, location: loc.id }, fetch)
			if (!res.ok || !res.result) return null
			const zone = res.result
			return {
				location: zone.location ?? loc.id,
				description: zone.description ?? '',
				ruleCount: zone.rules?.length ?? 0
			}
		})
	)

	const firewalls = results.filter((it) => it != null)

	return { project, firewalls }
}
