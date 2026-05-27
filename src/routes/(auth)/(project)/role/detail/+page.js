import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const roleId = url.searchParams.get('role')
	if (!roleId) redirect(302, `/role?project=${project}`)

	/** @type {Api.Response<Api.Role>} */
	const roleInfo = await api.invoke('role.get', { project, role: roleId }, fetch)
	if (!roleInfo.ok) {
		if (roleInfo.error?.notFound) redirect(302, `/role?project=${project}`)
		error(500, roleInfo.error?.message)
	}
	if (!roleInfo.result) redirect(302, `/role?project=${project}`)

	// Members come from the project-wide user/role map; viewing them is a
	// separate permission, so a forbidden response here must not break the page.
	/** @type {Api.Response<Api.List<Api.RoleUser>>} */
	const users = await api.invoke('role.users', { project }, fetch)
	const members = (users.result?.items ?? []).filter((u) => u.roles?.includes(roleId))

	return {
		menu: 'role',
		role: roleInfo.result,
		members,
		membersError: users.error
	}
}
