import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()
	const domainName = url.searchParams.get('domain')

	/** @type {Api.Response<Api.Domain>} */
	const domain = await api.invoke('domain.get', { project, domain: domainName }, fetch)
	if (!domain.ok) {
		if (domain.error?.notFound) redirect(302, `/domain?project=${project}`)
		error(500, domain.error?.message)
	}
	if (!domain.result) redirect(302, `/domain?project=${project}`)
	if (!domain.result.cdn) redirect(302, `/domain/detail?project=${project}&domain=${domainName}`)

	/** @type {Api.Response<Api.Location>} */
	const location = await api.invoke('location.get', { id: domain.result.location }, fetch)
	if (!location.ok) {
		error(500, location.error?.message)
	}
	if (!location.result) redirect(302, `/domain?project=${project}`)

	return {
		domain: domain.result,
		location: location.result
	}
}
