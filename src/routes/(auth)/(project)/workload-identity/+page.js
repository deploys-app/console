import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const workloadIdentities = await api.invoke('workloadIdentity.list', { project }, fetch)
	if (!workloadIdentities.ok && !workloadIdentities.error?.forbidden) {
		error(500, workloadIdentities.error?.message)
	}

	return {
		permission: {
			workloadIdentities: !workloadIdentities.error?.forbidden
		},
		workloadIdentities: workloadIdentities.result?.items ?? []
	}
}
