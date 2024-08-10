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

	/** @type {Api.Response<Api.RepositoryTagResult>} */
	const res = await api.invoke('registry/getTags', {
		project,
		repository: id
	}, fetch)

	return {
		id,
		repository: repository.result,
		tags: res.result?.items ?? [],
		error: res.error
	}
}
