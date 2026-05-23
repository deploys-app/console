import api from '$lib/api'

const LIMIT = 100

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.DropboxItem>>} */
	const res = await api.invoke('dropbox.list', { project, limit: LIMIT }, fetch)
	return {
		items: res.result?.items ?? [],
		error: res.error
	}
}
