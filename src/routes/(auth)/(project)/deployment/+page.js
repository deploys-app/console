import api from '$lib/api'

/** @typedef {import('$types').List<import('$types').Deployment>} DeploymentListResult */

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		/** @type {Promise<import('$types').ApiResponse<DeploymentListResult>>} */
		deployments: api.invoke('deployment.list', { project }, fetch)
	}
}
