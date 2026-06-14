import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [links, serviceAccounts] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		// Service accounts feed the edit modal's picker.
		api.invoke('serviceAccount.list', { project }, fetch)
	])

	return {
		links: links.result?.items ?? [],
		serviceAccounts: serviceAccounts.result?.items ?? [],
		error: links.error
	}
}
