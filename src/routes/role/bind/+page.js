import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const email = url.searchParams.get('email')

	const roles = await api.invoke('role.list', { project }, fetch)
	if (!roles.ok) {
		throw error(500, `roles: ${roles.error.message}`)
	}

	let selected
	if (email) {
		const users = await api.invoke('role.users', { project }, fetch)
		if (!users.ok) {
			throw error(500, `users: ${users.error.message}`)
		}

		selected = (users.result.items || []).find((x) => x.email === email)?.roles
	}

	return {
		project,
		menu: 'role.users',
		overrideRedirect: '/role/users',
		email,
		roles: roles.result.items || [],
		selected: selected || []
	}
}
