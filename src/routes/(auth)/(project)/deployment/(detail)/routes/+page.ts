import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, deployment } = await parent()

	const [routesResp, domainsResp] = await Promise.all([
		api.invoke<Api.List<Api.Route>>('route.list', { project }, fetch),
		api.invoke<Api.List<Api.Domain>>('domain.list', { project, location: deployment.location }, fetch)
	])

	const target = `deployment://${deployment.name}`
	const routes = (routesResp.result?.items ?? [])
		.filter((r) => r.location === deployment.location && r.target === target)

	const domains = (domainsResp.result?.items ?? [])
		.filter((d) => d.status === 'success')

	return {
		routes,
		domains,
		error: routesResp.error
	}
}
