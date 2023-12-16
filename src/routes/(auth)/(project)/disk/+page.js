import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	return {
		disks: api.invoke('disk.list', { project }, fetch)
	}
}
