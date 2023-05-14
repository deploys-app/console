import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const {
		project,
		location,
		deployment
	} = await parent()

	/** @type {import('$types').ApiResponse<import('$types').Location>} */
	const locationInfo = await api.invoke('location.get', { project, id: location }, fetch)
	if (!locationInfo.ok) {
		throw error(500, `location: ${locationInfo.error?.message}`)
	}
	if (!locationInfo.result) throw redirect(302, `/deployment?project=${project}`)

	return {
		location: locationInfo.result,
		deployment
	}
}
