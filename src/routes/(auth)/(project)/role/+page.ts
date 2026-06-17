import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.List<Api.Role>>('role.list', { project }, fetch)
	return {
		roles: res.result?.items ?? [],
		error: res.error
	}
}
