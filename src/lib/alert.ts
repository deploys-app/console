/**
 * Metric vocabulary + condition/target formatting shared by the alert list,
 * create/edit form, and detail page. Mirrors api/alert.go's AlertMetrics /
 * alertConditionString / alertTargetString (see AlertMetricCPU/Memory/
 * Requests/Egress and AlertPercentThresholdMax).
 */
import * as format from '$lib/format'

export interface AlertMetricMeta {
	value: string
	label: string
}

export const ALERT_METRICS: AlertMetricMeta[] = [
	{ value: 'cpu', label: 'CPU (% of limit)' },
	{ value: 'memory', label: 'Memory (% of limit)' },
	{ value: 'requests', label: 'Requests (per minute)' },
	{ value: 'egress', label: 'Egress (bytes per minute)' }
]

export const ALERT_CUSTOM_METRICS: AlertMetricMeta[] = [
	{ value: 'value', label: 'Value (gauge)' },
	{ value: 'rate', label: 'Rate (per minute)' }
]

export const ALERT_OPS = [
	{ value: '>=', label: '>= (at or above)' },
	{ value: '<=', label: '<= (at or below)' }
]

export function alertMetricLabel (metric: string): string {
	return ALERT_METRICS.concat(ALERT_CUSTOM_METRICS).find((m) => m.value === metric)?.label ?? metric
}

/**
 * Format a threshold/value for its metric's unit — percent for cpu/memory,
 * binary bytes/min for egress, the raw gauge for kind=custom value, per-minute
 * for rate/requests.
 */
export function alertThresholdString (metric: string, value: number): string {
	if (metric === 'cpu' || metric === 'memory') return `${value}%`
	if (metric === 'egress') return `${format.storage(value)}/min`
	if (metric === 'value') return String(value)
	return `${value}/min`
}

/**
 * Human-readable one-liner for a condition, e.g. "cpu >= 90% for 10m" or
 * "value >= 10 for 5m".
 */
export function alertConditionString (c: Api.AlertCondition): string {
	return `${c.metric} ${c.op} ${alertThresholdString(c.metric, c.threshold)} for ${c.forMinutes}m`
}

export function alertTargetString (t: Api.AlertTarget): string {
	if (t.kind === 'custom') return `${t.source} / ${t.series}`
	return `${t.location} / ${t.deployment}`
}

/**
 * lastValue is null before the first evaluation (or while nodata).
 */
export function alertValueString (metric: string, v: number | null | undefined): string {
	if (v === null || v === undefined) return '—'
	return alertThresholdString(metric, v)
}
