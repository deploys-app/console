import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.WafZoneList>('waf.list', { project }, fetch)

	return {
		project,
		firewalls: res.result?.items ?? [],
		error: res.error
	}
}
