import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	/** @type {import('$types').ApiResponse<import('$types').Deployment> | null} */
	let deployment = null
	if (location && name) {
		deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error?.notFound) {
				throw redirect(302, `/deployment?project=${project}`)
			}
			throw error(500, `deployment: ${deployment.error?.message}`)
		}
	}
	return {
		deployment: deployment?.result
	}
}
