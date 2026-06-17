import api from '$lib/api'
import { redirect, error } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')
	const deployment = await api.invoke<Api.Deployment>('deployment.get', { project, location, name }, fetch)
	if (!deployment.ok) {
		if (deployment.error?.notFound) {
			redirect(302, `/deployment?project=${project}`)
		}
		error(500, deployment.error?.message)
	}

	return {
		location,
		name,
		deployment: deployment.result
	}
}
