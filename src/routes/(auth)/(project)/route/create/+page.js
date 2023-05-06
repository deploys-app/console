import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Location>>} */
	const locations = await api.invoke('location.list', { project }, fetch)
	if (!locations.ok) {
		throw error(500, `locations: ${locations.error.message}`)
	}

	return {
		locations: locations.result.items || []
	}
}
