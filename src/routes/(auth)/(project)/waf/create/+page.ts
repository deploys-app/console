import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, locations } = await parent() as { project: string, locations: Api.Location[] }

	// Only locations whose backend supports the WAF can host a firewall; drop the
	// rest before the fan-out (also saves a waf.get per unsupported location).
	const supported = locations.filter((loc) => loc.features.waf)

	// No "list zones" endpoint — fan out waf.get to discover which locations are
	// already configured, then offer only the unconfigured ones for create.
	const configured = await Promise.all(
		supported.map(async (loc) => {
			const res = await api.invoke<Api.WafZone>('waf.get', { project, location: loc.id }, fetch)
			return res.ok && res.result ? loc.id : null
		})
	)
	const configuredSet = configured.filter((id) => id != null)

	const available = supported.filter((loc) => !configuredSet.includes(loc.id))

	return { project, locations: available }
}
