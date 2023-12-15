import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const id = url.searchParams.get('repository')
	const repository = await api.invoke('registry/get', {
		project,
		repository: id
	}, fetch)
	if (!repository.ok) {
		if (repository.error?.message === 'repository not found') {
			redirect(302, `/registry?project=${project}`)
		}
		error(500, repository.error?.message)
	}

	const [/* manifests , */tags] = await Promise.all([
		// api.invoke('registry/getManifests', {
		// 	project,
		// 	repository: id
		// }, fetch),
		api.invoke('registry/getTags', {
			project,
			repository: id
		}, fetch)
	])
	if (/* !manifests.ok || */ !tags.ok) {
		error(500, /* manifests.error?.message || */ tags.error?.message)
	}

	return {
		id,
		repository: repository.result,
		// manifests: manifests.result?.items ?? [],
		tags: tags.result?.items ?? []
	}
}
