import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const name = url.searchParams.get('name')

	let envGroup = null
	if (name) {
		/** @type {Api.Response<Api.EnvGroup>} */
		const res = await api.invoke('envGroup.get', { project, name }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) redirect(302, `/env-group?project=${project}`)
			error(500, res.error?.message)
		}
		if (!res.result) redirect(302, `/env-group?project=${project}`)
		envGroup = res.result
	}

	return {
		menu: 'env-group',
		envGroup
	}
}
