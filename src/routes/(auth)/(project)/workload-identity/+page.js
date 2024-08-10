import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.WorkloadIdentity>>} */
	const res = await api.invoke('workloadIdentity.list', { project }, fetch)
	return {
		workloadIdentities: res.result?.items ?? [],
		error: res.error
	}
}
