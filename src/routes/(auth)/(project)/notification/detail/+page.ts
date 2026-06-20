import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')
	if (!name) redirect(302, `/notification?project=${project}`)

	const res = await api.invoke<Api.NotificationItem>('notification.get', { project, name }, fetch)
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/notification?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/notification?project=${project}`)

	// Recent deliveries. A failure here shouldn't break the detail page, so the
	// items default to empty.
	const deliveries = await api.invoke<Api.NotificationDeliveriesResult>('notification.deliveries', { project, name, limit: 50 }, fetch)

	return {
		menu: 'notification',
		channel: res.result,
		deliveries: deliveries.result?.items ?? []
	}
}
