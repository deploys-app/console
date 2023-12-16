import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		workloadIdentities: api.invoke('workloadIdentity.list', { project }, fetch)
	}
}
