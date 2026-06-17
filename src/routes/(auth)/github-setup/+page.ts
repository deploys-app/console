import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

// GitHub's App "Setup URL" redirects here after installation.
// GitHub appends ?installation_id=N&setup_action=install and optionally ?state=<project>
// (we pass the project as state in the install link on the link page).
//
// This route lives OUTSIDE the (project) group because GitHub's redirect has no
// ?project= param. The (project)+layout.js redirects to /project when there is
// no ?project= param, so we route to /github/link without a project and let the
// (project) layout handle picking one.

export const load: PageLoad = ({ url }) => {
	const installationId = url.searchParams.get('installation_id')
	const state = url.searchParams.get('state')

	if (state && installationId) {
		redirect(302, `/github/link?project=${encodeURIComponent(state)}&installation_id=${installationId}`)
	}

	if (installationId) {
		// No project state — the (project) layout will redirect the user to pick a project.
		redirect(302, `/github/link?installation_id=${installationId}`)
	}

	redirect(302, '/github')
}
