import api from '$lib/api'
import { redirect, error } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const disk = await api.invoke<Api.Disk>('disk.get', { project, location, name }, fetch)
	if (!disk.ok) {
		if (disk.error?.notFound) redirect(302, `/disk?project=${project}`)
		error(500, disk.error?.message)
	}
	if (!disk.result) redirect(302, `/disk?project=${project}`)

	return {
		location,
		name,
		disk: disk.result
	}
}
