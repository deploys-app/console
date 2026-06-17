import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const res = await api.invoke<Api.List<Api.Disk>>('disk.list', { project }, fetch)
	return {
		disks: res.result?.items ?? [],
		error: res.error
	}
}
