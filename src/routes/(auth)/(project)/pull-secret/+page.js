import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.PullSecret>>} */
	const pullSecrets = await api.invoke('pullSecret.list', { project }, fetch)
	if (!pullSecrets.ok && !pullSecrets.error?.forbidden) {
		error(500, pullSecrets.error?.message)
	}

	return {
		permission: {
			pullSecrets: !pullSecrets.error?.forbidden
		},
		pullSecrets: pullSecrets.result?.items ?? []
	}
}
