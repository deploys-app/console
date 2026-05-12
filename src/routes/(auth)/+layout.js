import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ fetch }) {
	/** @type {[Api.Response<Api.Profile>, Api.Response<Api.List<Api.Project>>]} */
	const [
		me,
		projects
	] = await Promise.all([
		api.invoke('me.get', {}, fetch),
		api.invoke('project.list', {}, fetch)
	])
	if (!me.ok) {
		if (me.error?.unauth) redirect(302, '/auth/signin')
		error(500, me.error?.message)
	}
	if (!projects.ok) error(500, projects.error?.message)

	return {
		profile: me.result,
		projects: projects.result?.items ?? []
	}
}
