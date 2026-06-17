import { error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const {
		project,
		location,
		name,
		deployment
	} = await parent()

	const revisions = await api.invoke<Api.List<Api.Deployment>>('deployment.revisions', { project, location, name }, fetch)
	if (!revisions.ok) error(500, revisions.error?.message)

	return {
		deployment,
		revisions: revisions.result.items ?? []
	}
}
