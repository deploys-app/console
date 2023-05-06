import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {import('$types').ApiResponse<import('$types').Profile>} */
	const me = await api.invoke('me.get', {}, fetch)
	if (!me.ok && me.error?.unauth) {
		throw redirect(302, '/auth/signin')
	}

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').ProjectItem>>} */
	const projects = await api.invoke('project.list', {}, fetch)
	if (!projects.ok) {
		throw error(500, projects.error?.message)
	}

	return {
		profile: me.result,
		projects: projects.result.items || []
	}
}
