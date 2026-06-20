import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')

	let channel: Api.NotificationItem | null = null
	if (name) {
		const res = await api.invoke<Api.NotificationItem>('notification.get', { project, name }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) redirect(302, `/notification?project=${project}`)
			error(500, res.error?.message)
		}
		if (!res.result) redirect(302, `/notification?project=${project}`)
		channel = res.result
	}

	return {
		menu: 'notification',
		channel
	}
}
