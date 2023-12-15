import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const repositories = await api.invoke('registry/list', { project }, fetch)
	if (!repositories.ok && !repositories.error?.forbidden) {
		error(500, repositories.error?.message)
	}

	return {
		permission: {
			repositories: !repositories.error?.forbidden
		},
		repositories: repositories.result?.items ?? []
	}
}
