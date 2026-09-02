import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project, deployment } = await parent()
	if (!deployment) return { metricSources: [] as Api.MetricSourceItem[] }
	const res = await api.invoke<Api.List<Api.MetricSourceItem>>('metricSource.list', { project }, fetch)
	const items = res.ok ? (res.result?.items ?? []) : []
	return {
		metricSources: items.filter((s) =>
			s.location === deployment.location && s.deployment === deployment.name
		)
	}
}
