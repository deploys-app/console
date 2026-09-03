import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.MetricSourceItem, 'metricSources'>('metricSource.list', 'metricSources')
