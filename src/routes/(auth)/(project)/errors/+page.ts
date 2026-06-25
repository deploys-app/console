import api from '$lib/api'
import type { PageLoad } from './$types'

// Initial filter/sort must match the component's defaults so the server-side
// fetch is exactly the view the page renders before any filter change.
const INITIAL_STATUS: Api.ErrorStatusFilter = 'open'
const INITIAL_SORT: Api.ErrorSort = 'lastSeen'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()
	// Fetch the first page during load — like the other resource list pages — so
	// the list is present on first paint instead of flashing a client-side
	// "Loading errors…" after mount. Subsequent (project/status/sort) reloads and
	// load-more are still owned by the client effect in +page.svelte.
	const initial = await api.invoke<Api.ErrorListResult>('error.list', {
		project,
		status: INITIAL_STATUS,
		sort: INITIAL_SORT
	}, fetch)
	return {
		project,
		menu: 'errors',
		overrideRedirect: '/errors',
		initial
	}
}
