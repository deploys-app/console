import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ fetch, url, data }) => {
	const [
		me,
		projects
	] = await Promise.all([
		api.invoke<Api.Profile>('me.get', {}, fetch),
		api.invoke<Api.List<Api.Project>>('project.list', {}, fetch)
	])
	if (!me.ok) {
		if (me.error?.unauth) {
			if (data.hasToken) {
				// Expired session: we hold a token the API now rejects. Surface a 401
				// so the root +error.svelte shows a "Sign in to continue" page and the
				// user re-authenticates deliberately. $page.url is preserved, which the
				// error page turns into the `?redirect=` so sign-in lands back here.
				error(401, 'unauthorized')
			}
			// First-time visitor with no session — bounce straight to sign-in rather
			// than show an interstitial they never landed on. Remember the path so
			// the OAuth round-trip returns them here.
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
