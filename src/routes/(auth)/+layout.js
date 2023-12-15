import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {import('$types').ApiResponse<import('$types').Profile>} */
	const me = await api.invoke('me.get', {}, fetch)
	if (!me.ok) {
		if (me.error?.unauth) redirect(302, '/auth/signin')
		error(500, me.error?.message)
	}
	if (!me.result) error(500, 'no profile')

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Project>>} */
	const projects = await api.invoke('project.list', {}, fetch)
	if (!projects.ok) error(500, projects.error?.message)

	return {
		profile: me.result,
		projects: projects.result?.items ?? []
	}
}
