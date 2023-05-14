import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const roleId = url.searchParams.get('role')

	/** @type {import('$types').ApiResponse<string[]>} */
	const permissions = await api.invoke('role.permissions', {}, fetch)
	if (!permissions.ok) {
		throw error(500, `permissions: ${permissions.error?.message}`)
	}

	let role = null
	if (roleId) {
		/** @type {import('$types').ApiResponse<import('$types').Role>} */
		const roleInfo = await api.invoke('role.get', { project, role: roleId }, fetch)
		if (!roleInfo.ok) {
			if (roleInfo.error?.notFound) {
				throw redirect(302, `/role?project=${project}`)
			}
			throw error(500, `role: ${roleInfo.error?.message}`)
		}
		if (!roleInfo.result) throw redirect(302, `/role?project=${project}`)
		role = roleInfo.result
	}

	return {
		menu: 'role',
		role,
		permissions: permissions.result ?? []
	}
}
