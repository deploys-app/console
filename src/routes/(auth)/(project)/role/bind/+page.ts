import { error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const email = url.searchParams.get('email')

	const roles = await api.invoke<Api.List<Api.Role>>('role.list', { project }, fetch)
	if (!roles.ok) error(500, roles.error?.message)

	let selected
	if (email) {
		const users = await api.invoke<Api.List<Api.RoleUser>>('role.users', { project }, fetch)
		if (!users.ok) error(500, users.error?.message)

		selected = users.result?.items?.find((x) => x.email === email)?.roles
	}

	return {
		menu: 'role.users',
		overrideRedirect: '/role/users',
		email,
		roles: roles.result?.items ?? [],
		selected: selected ?? []
	}
}
