import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.WafZoneList>} */
	const res = await api.invoke('waf.list', { project }, fetch)

	return {
		project,
		firewalls: res.result?.items ?? [],
		error: res.error
	}
}
