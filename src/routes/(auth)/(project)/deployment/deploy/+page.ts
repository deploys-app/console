import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	let deployment: Api.Response<Api.Deployment> | null = null
	if (location && name) {
		deployment = await api.invoke<Api.Deployment>('deployment.get', { project, location, name }, fetch)
		if (!deployment.ok) {
			if (deployment.error?.notFound) redirect(302, `/deployment?project=${project}`)
			error(500, deployment.error?.message)
		}
	}
	return {
		deployment: deployment?.result
	}
}
