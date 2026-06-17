import api from '$lib/api'
import type { PageLoad } from './$types'

const LIMIT = 100

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.List<Api.DropboxItem>>('dropbox.list', { project, limit: LIMIT }, fetch)
	return {
		items: res.result?.items ?? [],
		error: res.error
	}
}
