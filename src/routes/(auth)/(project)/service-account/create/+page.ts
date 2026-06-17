import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const id = url.searchParams.get('id')

	let serviceAccount: Api.Response<Api.ServiceAccount> | undefined
	if (id) {
		serviceAccount = await api.invoke<Api.ServiceAccount>('serviceAccount.get', { project, id }, fetch)
		if (!serviceAccount.ok) {
			if (serviceAccount.error?.notFound) {
				redirect(302, `/service-account?project=${project}`)
			}
			error(500, serviceAccount.error?.message)
		}
	}

	return {
		id,
		serviceAccount: serviceAccount?.result
	}
}
