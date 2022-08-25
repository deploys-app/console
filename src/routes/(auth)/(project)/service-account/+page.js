import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const serviceAccounts = await api.invoke('serviceAccount.list', { project }, fetch)
	if (!serviceAccounts.ok && !serviceAccounts.error.forbidden) {
		throw error(500, `serviceAccounts: ${serviceAccounts.error.message}`)
	}
	return {
		permission: {
			serviceAccounts: !serviceAccounts.error?.forbidden
		},
		serviceAccounts: serviceAccounts.result?.items || []
	}
}
