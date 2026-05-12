import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.RoleUser>>} */
	const res = await api.invoke('role.users', { project }, fetch)
	return {
		menu: 'role.users',
		overrideRedirect: '/role/users',
		users: res.result?.items ?? [],
		error: res.error
	}
}
