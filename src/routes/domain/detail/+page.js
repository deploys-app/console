import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const domainName = url.searchParams.get('domain')

	const domain = await api.invoke('domain.get', { project, domain: domainName }, fetch)
	if (!domain.ok) {
		if (domain.error?.notFound) {
			throw redirect(302, `/domain?project=${project}`)
		}
		throw error(500, `domain: ${domain.error?.message}`)
	}

	return {
		project,
		domain: domain.result
	}
}
