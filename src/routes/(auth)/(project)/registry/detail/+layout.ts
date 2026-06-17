import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const id = url.searchParams.get('repository')

	const repository = await api.invoke<Api.Repository>('registry.get', {
		project,
		repository: id
	}, fetch)
	if (!repository.ok) {
		if (repository.error?.message === 'repository not found') {
			redirect(302, `/registry?project=${project}`)
		}
		error(500, repository.error?.message)
	}

	return {
		id,
		repository: repository.result
	}
}
