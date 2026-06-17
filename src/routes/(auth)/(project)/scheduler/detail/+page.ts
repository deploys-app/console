import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')
	if (!name) redirect(302, `/scheduler?project=${project}`)

	const res = await api.invoke<Api.SchedulerJob>('scheduler.get', { project, name }, fetch)
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/scheduler?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/scheduler?project=${project}`)

	// Recent invocations. A failure here shouldn't break the detail page, so the
	// items default to empty.
	const logs = await api.invoke<Api.SchedulerLogsResult>('scheduler.logs', { project, name, limit: 50 }, fetch)

	return {
		menu: 'scheduler',
		job: res.result,
		invocations: logs.result?.items ?? []
	}
}
