import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const emails = await api.invoke('email.list', { project }, fetch)
	if (!emails.ok && !emails.error?.forbidden) {
		error(500, emails.error?.message)
	}

	return {
		permission: {
			emails: !emails.error?.forbidden
		},
		emails: emails.result?.items ?? []
	}
}
