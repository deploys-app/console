import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const roleId = url.searchParams.get('role')

	const permissions = await api.invoke('role.permissions', {}, fetch)
	if (!permissions.ok) {
		throw error(500, `permissions: ${permissions.error.message}`)
	}

	let role
	if (roleId) {
		const roleInfo = await api.invoke('role.get', { project, role: roleId }, fetch)
		if (!roleInfo.ok) {
			throw error(500, `role: ${roleInfo.error.message}`)
		}
		role = roleInfo.result
	}

	return {
		project,
		menu: 'role',
		role,
		permissions: permissions.result || []
	}
}
