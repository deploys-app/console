import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const id = url.searchParams.get('id')
	const serviceAccount = await api.invoke<Api.ServiceAccount>('serviceAccount.get', { project, id }, fetch)
	if (!serviceAccount.ok) {
		if (serviceAccount.error?.message === 'api: service account not found') {
			redirect(302, `/service-account?project=${project}`)
		}
		error(500, serviceAccount.error?.message)
	}
	return {
		id,
		serviceAccount: serviceAccount.result
	}
}
