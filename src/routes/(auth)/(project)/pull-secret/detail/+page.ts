import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const pullSecret = await api.invoke<Api.PullSecret>('pullSecret.get', { project, location, name }, fetch)
	if (!pullSecret.ok) {
		if (pullSecret.error?.notFound) redirect(302, `/pull-secret?project=${project}`)
		error(500, pullSecret.error?.message)
	}
	if (!pullSecret.result) redirect(302, `/pull-secret?project=${project}`)

	return {
		location,
		name,
		pullSecret: pullSecret.result
	}
}
