import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const deployments = await api.invoke('deployment.list', { project }, fetch)
	if (!deployments.ok && !deployments.error.forbidden) {
		throw error(500, `deployments: ${deployments.error.message}`)
	}
	return {
		project,
		permission: {
			deployments: !deployments.error?.forbidden
		},
		deployments: deployments.result?.items || []
	}
}
