import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project, id } = await parent()

	/** @type {Api.Response<Api.RepositoryTagResult>} */
	const res = await api.invoke('registry.getTags', {
		project,
		repository: id
	}, fetch)

	return {
		tags: res.result?.items ?? [],
		error: res.error
	}
}
