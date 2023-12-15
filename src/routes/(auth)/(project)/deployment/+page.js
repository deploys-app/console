import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {import('$types').ApiResponse<import('$types').List<import('$types').Deployment>>} */
	const deployments = await api.invoke('deployment.list', { project }, fetch)
	if (!deployments.ok && !deployments.error?.forbidden) {
		error(500, deployments.error?.message)
	}

	return {
		permission: {
			deployments: !deployments.error?.forbidden
		},
		deployments: deployments.result?.items ?? []
	}
}
