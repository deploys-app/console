import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.List<Api.RoleUser>>('role.users', { project }, fetch)
	return {
		menu: 'role.users',
		overrideRedirect: '/role/users',
		users: res.result?.items ?? [],
		error: res.error
	}
}
