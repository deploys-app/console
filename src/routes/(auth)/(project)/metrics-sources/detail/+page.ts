import { redirect, error } from '@sveltejs/kit'
import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()
	const name = url.searchParams.get('name')
	if (!name) redirect(302, `/metrics-sources?project=${project}`)

	const res = await api.invoke<Api.MetricSourceItem>('metricSource.get', { project, name }, fetch)
	if (!res.ok) {
		if (res.error?.notFound) redirect(302, `/metrics-sources?project=${project}`)
		error(500, res.error?.message)
	}
	if (!res.result) redirect(302, `/metrics-sources?project=${project}`)

	const series = await api.invoke<Api.MetricSourceSeriesResult>('metricSource.series', { project, name }, fetch)

	return {
		menu: 'metric-source',
		source: res.result,
		series: series.result?.items ?? []
	}
}
