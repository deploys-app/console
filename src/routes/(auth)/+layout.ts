import { error } from '@sveltejs/kit'
import api from '$lib/api'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ fetch }) => {
	const [
		me,
		projects
	] = await Promise.all([
		api.invoke<Api.Profile>('me.get', {}, fetch),
		api.invoke<Api.List<Api.Project>>('project.list', {}, fetch)
	])
	if (!me.ok) {
		if (me.error?.unauth) {
			// Don't bounce straight to the OAuth provider — surface a 401 so the
			// root +error.svelte can show a "session expired" page with an explicit
			// "Sign in" button. The current URL is preserved as $page.url, which the
			// error page turns into the `?redirect=` so sign-in lands back here.
			error(401, 'unauthorized')
		}
		error(500, me.error?.message)
	}
	if (!projects.ok) error(500, projects.error?.message)

	return {
		profile: me.result,
		projects: projects.result?.items ?? []
	}
}
