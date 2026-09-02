/**
 * Status + chart helpers for metric sources. Mirrors api/metricsource.go's
 * metricSourceStatus (disabled → error → truncated → ok).
 */
import type { MetricSeries } from '$lib/charts/util'

export type MetricSourceStatus = 'ok' | 'disabled' | 'truncated' | 'error'

export function metricSourceStatus (s: Api.MetricSourceItem): MetricSourceStatus {
	if (s.disabled) return 'disabled'
	if (s.lastError) return 'error'
	if (s.truncated) return 'truncated'
	return 'ok'
}

export const TRUNCATED_BANNER = 'series cap hit — extra series were dropped'

export function metricSourceChartSeries (items: Api.UsageMetricsLine[]): MetricSeries[] {
	return items.map((l) => ({ prefix: l.name, lines: [l] }))
}
