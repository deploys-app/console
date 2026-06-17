import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const domainName = url.searchParams.get('domain')

	const domain = await api.invoke<Api.Domain>('domain.get', { project, domain: domainName }, fetch)
	if (!domain.ok) {
		if (domain.error?.notFound) redirect(302, `/domain?project=${project}`)
		error(500, domain.error?.message)
	}
	if (!domain.result) redirect(302, `/domain?project=${project}`)

	return {
		domain: domain.result
	}
}
