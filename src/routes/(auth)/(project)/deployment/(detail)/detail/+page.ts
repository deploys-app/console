import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const {
		project,
		location,
		deployment
	} = await parent()

	const locationInfo = await api.invoke<Api.Location>('location.get', { project, id: location }, fetch)
	if (!locationInfo.ok) {
		error(500, `location: ${locationInfo.error?.message}`)
	}
	if (!locationInfo.result) redirect(302, `/deployment?project=${project}`)

	return {
		location: locationInfo.result,
		deployment
	}
}
