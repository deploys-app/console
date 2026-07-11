import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, locations } = await parent() as { project: string, locations: Api.Location[] }

	// Only locations whose backend supports the WAF can host a firewall.
	const supported = locations.filter((loc) => loc.features.waf)

	// One waf.list discovers every configured location; offer only the
	// unconfigured ones for create. waf.list is its own IAM check, separate
	// from waf.get — a role holding waf.get without waf.list falls back to the
	// per-location waf.get fan-out so its page stays accurately filtered. With
	// neither grant, a non-ok get counts as unconfigured and every location is
	// offered rather than erroring the page — the server still enforces
	// waf.set on submit.
	const res = await api.invoke<Api.WafZoneList>('waf.list', { project }, fetch)
	let configured: string[]
	if (res.ok) {
		configured = (res.result?.items ?? []).map((z) => z.location)
	} else {
		configured = (await Promise.all(
			supported.map(async (loc) => {
				const r = await api.invoke<Api.WafZone>('waf.get', { project, location: loc.id }, fetch)
				return r.ok && r.result ? loc.id : null
			})
		)).filter((id) => id != null)
	}

	const available = supported.filter((loc) => !configured.includes(loc.id))

	return { project, locations: available }
}
