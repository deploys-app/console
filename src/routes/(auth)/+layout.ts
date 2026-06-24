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
			const next = url.pathname + url.search
			const isRoot = next === '/'
			// On a deep link an expired session (a token the API now rejects) gets the
			// "Sign in to continue" page so re-auth returns the user to where they
			// were. But the bare root is just a router (it redirects to /project once
			// you're in) — there's nothing to preserve and no value in an interstitial
			// — so `/` always bounces straight to sign-in, expired token or not. A
			// first-time visitor with no session anywhere is likewise redirected.
			if (data.hasToken && !isRoot) {
				error(401, 'unauthorized')
			}
			redirect(302, isRoot
				? '/auth/signin'
				: `/auth/signin?redirect=${encodeURIComponent(next)}`)
		}
		error(500, me.error?.message)
	}
	if (!projects.ok) error(500, projects.error?.message)

	return {
		profile: me.result,
		projects: projects.result?.items ?? []
	}
}
