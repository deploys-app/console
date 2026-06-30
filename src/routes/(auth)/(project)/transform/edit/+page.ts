import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''
	const ruleId = url.searchParams.get('rule')

	if (!location) {
		redirect(302, `/transform?project=${project}`)
	}

	const manageUrl = `/transform/manage?project=${project}&location=${encodeURIComponent(location)}`

	const res = await api.invoke<Api.TransformZone>('transform.get', { project, location }, fetch)
	// A missing zone is the normal "transform not configured yet" state — render
	// an empty editor (create mode). Surface anything else.
	if (!res.ok && !res.error?.notFound) {
		error(500, res.error?.message)
	}
	const zone = res.result ?? null

	// Editing a specific rule requires its zone + rule to exist; otherwise send
	// the user back to the list for this location.
	if (ruleId) {
		const found = zone?.transforms?.some((r) => r.id === ruleId)
		if (!found) {
			redirect(302, manageUrl)
		}
	}

	return {
		project,
		location,
		ruleId,
		zone
	}
}
