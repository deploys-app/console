import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const roleId = url.searchParams.get('role')
	if (!roleId) redirect(302, `/role?project=${project}`)

	const roleInfo = await api.invoke<Api.Role>('role.get', { project, role: roleId }, fetch)
	if (!roleInfo.ok) {
		if (roleInfo.error?.notFound) redirect(302, `/role?project=${project}`)
		error(500, roleInfo.error?.message)
	}
	if (!roleInfo.result) redirect(302, `/role?project=${project}`)

	// Members come from the project-wide user/role map; viewing them is a
	// separate permission, so a forbidden response here must not break the page.
	const users = await api.invoke<Api.List<Api.RoleUser>>('role.users', { project }, fetch)
	const members = (users.result?.items ?? []).filter((u) => u.roles?.includes(roleId))

	return {
		menu: 'role',
		role: roleInfo.result,
		members,
		membersError: users.error
	}
}
