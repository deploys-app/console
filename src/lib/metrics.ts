/**
 * Shared time-range vocabulary for the activity dashboards (cache, waf): the
 * selectable windows, their lengths in seconds, human labels, and per-range
 * bucket widths (kept around 48–72 columns so chart lines stay legible).
 */
export interface RangeOption {
	value: string
	label: string
}

export const RANGE_OPTIONS: RangeOption[] = [
	{ value: '1h', label: '1H' },
	{ value: '6h', label: '6H' },
	{ value: '12h', label: '12H' },
	{ value: '1d', label: '24H' },
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' }
]

export const RANGE_SECONDS: Record<string, number> = { '1h': 3600, '6h': 21600, '12h': 43200, '1d': 86400, '7d': 604800, '30d': 2592000 }

export const RANGE_LABEL: Record<string, string> = {
	'1h': 'last hour',
	'6h': 'last 6 hours',
	'12h': 'last 12 hours',
	'1d': 'last 24 hours',
	'7d': 'last 7 days',
	'30d': 'last 30 days'
}

export const BUCKET_SECONDS: Record<string, number> = { '1h': 60, '6h': 300, '12h': 600, '1d': 1800, '7d': 10800, '30d': 43200 }
