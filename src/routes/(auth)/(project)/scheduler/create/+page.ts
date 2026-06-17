import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')

	let job: Api.SchedulerJob | null = null
	if (name) {
		const res = await api.invoke<Api.SchedulerJob>('scheduler.get', { project, name }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) redirect(302, `/scheduler?project=${project}`)
			error(500, res.error?.message)
		}
		if (!res.result) redirect(302, `/scheduler?project=${project}`)
		job = res.result
	}

	return {
		menu: 'scheduler',
		job
	}
}
