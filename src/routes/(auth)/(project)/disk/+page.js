import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const disks = await api.invoke('disk.list', { project }, fetch)
	if (!disks.ok && !disks.error.forbidden) {
		throw error(500, `disks: ${disks.error.message}`)
	}

	return {
		permission: {
			disks: !disks.error?.forbidden
		},
		disks: disks.result?.items || []
	}
}
