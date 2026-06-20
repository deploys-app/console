import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const roleId = url.searchParams.get('role')

	const permissions = await api.invoke<string[]>('role.permissions', {}, fetch)
	if (!permissions.ok) error(500, permissions.error?.message)

	let role = null
	if (roleId) {
		const roleInfo = await api.invoke<Api.Role>('role.get', { project, role: roleId }, fetch)
		if (!roleInfo.ok) {
			if (roleInfo.error?.notFound) redirect(302, `/role?project=${project}`)
			error(500, roleInfo.error?.message)
		}
		if (!roleInfo.result) redirect(302, `/role?project=${project}`)
		role = roleInfo.result
	}

	return {
		menu: 'role',
		role,
		// The assignable-permission catalog. Deliberately NOT named `permissions`:
		// the (project) layout returns the caller's effective grants under that
		// key, and a page-data field of the same name would shadow it in
		// $page.data — breaking GuardedButton's `can()` on this page.
		allPermissions: permissions.result ?? []
	}
}
