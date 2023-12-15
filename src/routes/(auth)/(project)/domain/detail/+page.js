import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const domainName = url.searchParams.get('domain')

	/** @type {import('$types').ApiResponse<import('$types').Domain>} */
	const domain = await api.invoke('domain.get', { project, domain: domainName }, fetch)
	if (!domain.ok) {
		if (domain.error?.notFound) redirect(302, `/domain?project=${project}`)
		error(500, domain.error?.message)
	}
	if (!domain.result) redirect(302, `/domain?project=${project}`)

	return {
		domain: domain.result
	}
}
