import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project, id } = await parent()

	/** @type {Api.Response<Api.RepositoryManifestResult>} */
	const res = await api.invoke('registry/getManifests', {
		project,
		repository: id
	}, fetch)

	return {
		manifests: res.result?.items ?? [],
		error: res.error
	}
}
