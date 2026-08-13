import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''

	if (!location) {
		redirect(302, `/waf?project=${project}`)
	}

	// location.get pre-flight: managed rules (OWASP CRS) are gated per location
	// (features.waf.managedRules), so the card renders a disabled "Not available
	// in this location" state instead of letting the user fill it in and hit the
	// server-side reject on save. Same convention as the me.authorized/can()
	// permission pre-flight. Best-effort: a lookup failure fails closed to the
	// unavailable state (the server still enforces the gate).
	const [res, locRes] = await Promise.all([
		api.invoke<Api.WafZone>('waf.get', { project, location }, fetch),
		api.invoke<Api.Location>('location.get', { project, id: location }, fetch)
	])
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
		zone: res.result,
		managedRulesSupported: (locRes.ok && locRes.result?.features?.waf?.managedRules) ?? false
	}
}
