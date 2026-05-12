import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	/** @type {Api.Response<Api.List<Api.Disk>>} */
	const res = await api.invoke('disk.list', { project }, fetch)
	return {
		disks: res.result?.items ?? [],
		error: res.error
	}
}
