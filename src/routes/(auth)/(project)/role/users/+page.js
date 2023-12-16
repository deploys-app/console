import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		menu: 'role.users',
		overrideRedirect: '/role/users',
		/** @type {Promise<Api.Response<Api.List<Api.RoleUser>>>} */
		users: api.invoke('role.users', { project }, fetch)
	}
}
