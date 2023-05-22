import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const domains = await api.invoke('domain.list', { project }, fetch)
	if (!domains.ok && !domains.error?.forbidden) {
		throw error(500, domains.error?.message)
	}

	return {
		permission: {
			domains: !domains.error?.forbidden
		},
		domains: domains.result.items ?? []
	}
}
