import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

// Metrics are fetched client-side (per time range) so the range switcher is
// snappy and the page can auto-refresh. The loader only resolves the zone so
// the per-override table can show override descriptions and we can bail early
// when cache isn't configured.
export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location') ?? ''

	if (!location) {
		redirect(302, `/cache?project=${project}`)
	}

	const res = await api.invoke<Api.CacheZone>('cache.get', { project, location }, fetch)

	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/cache?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/cache?project=${project}`)

	return {
		project,
		location,
		zone: res.result
	}
}
