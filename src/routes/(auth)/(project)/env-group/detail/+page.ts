import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')
	if (!name) redirect(302, `/env-group?project=${project}`)

	const res = await api.invoke<Api.EnvGroup>('envGroup.get', { project, name }, fetch)
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/env-group?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/env-group?project=${project}`)

	return {
		menu: 'env-group',
		envGroup: res.result
	}
}
