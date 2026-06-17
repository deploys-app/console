import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	let disk: Api.Response<Api.Disk> | undefined
	if (location && name) {
		disk = await api.invoke<Api.Disk>('disk.get', { project, location, name }, fetch)
		if (!disk.ok) {
			if (disk.error?.notFound) redirect(302, `/disk?project=${project}`)
			error(500, disk.error?.message)
		}
	}

	return {
		location,
		name,
		disk: disk?.result
	}
}
