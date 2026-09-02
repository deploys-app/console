import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')

	let alert: Api.AlertItem | null = null
	if (name) {
		const res = await api.invoke<Api.AlertItem>('alert.get', { project, name }, fetch)
		if (!res.ok) {
			if (res.error?.notFound) redirect(302, `/alert?project=${project}`)
			error(500, res.error?.message)
		}
		if (!res.result) redirect(302, `/alert?project=${project}`)
		alert = res.result
	}

	// Delivery uses the project's notification channels; a failure here shouldn't
	// break the form, so default to "channels exist" (no warning) rather than
	// false-alarming on a transient error.
	const channels = await api.invoke<Api.List<Api.NotificationItem>>('notification.list', { project }, fetch)
	const hasChannels = channels.ok ? (channels.result?.items.length ?? 0) > 0 : true

	const sources = await api.invoke<Api.List<Api.MetricSourceItem>>('metricSource.list', { project }, fetch)

	return {
		menu: 'alert',
		alert,
		hasChannels,
		metricSources: sources.ok ? (sources.result?.items ?? []) : []
	}
}
