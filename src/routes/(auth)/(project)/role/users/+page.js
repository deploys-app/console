import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const users = await api.invoke('role.users', { project }, fetch)
	if (!users.ok && !users.error?.forbidden) error(500, users.error?.message)

	return {
		menu: 'role.users',
		overrideRedirect: '/role/users',
		permission: {
			users: !users.error?.forbidden
		},
		users: users.result?.items ?? []
	}
}
