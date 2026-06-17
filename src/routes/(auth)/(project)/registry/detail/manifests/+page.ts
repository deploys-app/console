import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, id } = await parent()

	const res = await api.invoke<Api.RepositoryManifestResult>('registry.getManifests', {
		project,
		repository: id
	}, fetch)

	return {
		manifests: res.result?.items ?? [],
		error: res.error
	}
}
