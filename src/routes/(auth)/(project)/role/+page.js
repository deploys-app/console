import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const roles = await api.invoke('role.list', { project }, fetch)
	if (!roles.ok && !roles.error?.forbidden) {
		error(500, roles.error?.message)
	}

	return {
		permission: {
			roles: !roles.error?.forbidden
		},
		roles: roles.result?.items ?? []
	}
}
