import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const [links, serviceAccounts] = await Promise.all([
		api.invoke<Api.List<Api.GithubLink>>('github.list', { project }, fetch),
		// Service accounts feed the edit modal's picker.
		api.invoke<Api.List<Api.ServiceAccount>>('serviceAccount.list', { project }, fetch)
	])

	return {
		links: links.result?.items ?? [],
		serviceAccounts: serviceAccounts.result?.items ?? [],
		error: links.error
	}
}
