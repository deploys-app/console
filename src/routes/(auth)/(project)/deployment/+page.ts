import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.List<Api.Deployment>>('deployment.list', { project }, fetch)
	return {
		deployments: res.result?.items ?? [],
		error: res.error
	}
}
