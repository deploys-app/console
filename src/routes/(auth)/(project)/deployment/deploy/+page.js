import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	/** @type {Api.Response<Api.Deployment> | null} */
	let deployment = null
	if (location && name) {
		deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error?.notFound) redirect(302, `/deployment?project=${project}`)
			error(500, deployment.error?.message)
		}
	}
	return {
		deployment: deployment?.result
	}
}
