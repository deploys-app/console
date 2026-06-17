import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ fetch, url }) => {
	const [
		me,
		projects
	] = await Promise.all([
		api.invoke<Api.Profile>('me.get', {}, fetch),
		api.invoke<Api.List<Api.Project>>('project.list', {}, fetch)
	])
	if (!me.ok) {
		if (me.error?.unauth) {
			// Remember where the user was headed so the OAuth round-trip can land
			// them back here instead of dumping them on the dashboard. The path is
			// same-origin by construction; signin/callback re-validate it.
			const next = url.pathname + url.search
			redirect(302, next && next !== '/'
				? `/auth/signin?redirect=${encodeURIComponent(next)}`
				: '/auth/signin')
		}
		error(500, me.error?.message)
	}
	if (!projects.ok) error(500, projects.error?.message)

	return {
		profile: me.result,
		projects: projects.result?.items ?? []
	}
}
