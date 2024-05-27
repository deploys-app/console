import api from '$lib/api'
import { redirect, error } from '@sveltejs/kit'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')
	/** @type {Api.Response<Api.Deployment>} */
	const deployment = await api.invoke('deployment.get', { project, location, name }, fetch)
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
