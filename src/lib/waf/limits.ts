// Shared rate-limit helpers for the firewall manage + limit edit pages. Limit
// ids are auto-generated and stable for the life of a limit (like rule ids),
// but limits have no priority — order doesn't matter.

/**
 * One characteristic of the bucket key. Header/cookie carry a name; the rest
 * round-trip as a bare keyword ('ip', 'host', 'country', 'asn').
 */
export interface KeyRow {
	type: 'ip' | 'host' | 'country' | 'asn' | 'header' | 'cookie'
	name: string
}

export interface LimitForm {
	id: string
	description: string
	key: KeyRow[]
	rate: number
	window: string
	algorithm: 'fixed' | 'sliding'
	mode: 'enforce' | 'shadow'
	status: number
	message: string
	filter: string
}

export const DEFAULT_LIMIT_STATUS = 429
export const DEFAULT_LIMIT_MESSAGE = 'Too Many Requests'

export const modeLabels: Record<string, string> = {
	enforce: 'Enforce',
	shadow: 'Shadow'
}

export const keyTypeLabels: Record<KeyRow['type'], string> = {
	ip: 'IP address',
	host: 'Host',
	country: 'Country',
	asn: 'ASN',
	header: 'Header',
	cookie: 'Cookie'
}

// Window presets covering the API's allowed 1s..1h range. Zones loaded with a
// window outside this list still render — the edit page appends the loaded
// value as an extra option.
export const windowOptions: { value: string, label: string }[] = [
	{ value: '1s', label: '1 second' },
	{ value: '10s', label: '10 seconds' },
	{ value: '30s', label: '30 seconds' },
	{ value: '1m', label: '1 minute' },
	{ value: '5m', label: '5 minutes' },
	{ value: '10m', label: '10 minutes' },
	{ value: '30m', label: '30 minutes' },
	{ value: '1h', label: '1 hour' }
]

/**
 * Parse an API key part ('ip', 'header:x-api-key', …) into a form row.
 */
export function parseKeyPart (part: string): KeyRow {
	if (part.startsWith('header:')) return { type: 'header', name: part.slice('header:'.length) }
	if (part.startsWith('cookie:')) return { type: 'cookie', name: part.slice('cookie:'.length) }
	if (part === 'host' || part === 'country' || part === 'asn') return { type: part, name: '' }
	return { type: 'ip', name: '' }
}

/**
 * Render a form row back into the API key part shape. Header/cookie rows with
 * an empty name are incomplete and yield ''. Header names are normalized to
 * lowercase (HTTP headers are case-insensitive — parapet does the same);
 * cookie names keep their spelling (cookies match case-sensitively).
 */
export function keyRowToApi (row: KeyRow): string {
	if (row.type === 'header' || row.type === 'cookie') {
		const name = row.name.trim()
		if (!name) return ''
		return row.type === 'header' ? `header:${name.toLowerCase()}` : `cookie:${name}`
	}
	return row.type
}

/**
 * Human label for an API key, e.g. ['ip', 'header:x-api-key'] →
 * "IP + Header x-api-key".
 */
export function describeKey (key?: string[]): string {
	const parts = (key && key.length > 0 ? key : ['ip']).map((part) => {
		const row = parseKeyPart(part)
		if (row.type === 'header' || row.type === 'cookie') {
			return `${keyTypeLabels[row.type]} ${row.name}`
		}
		return row.type === 'ip' ? 'IP' : keyTypeLabels[row.type]
	})
	return parts.join(' + ')
}

export function limitForm (limit?: Api.WafLimit): LimitForm {
	return {
		id: limit?.id ?? '',
		description: limit?.description ?? '',
		key: (limit?.key?.length ? limit.key : ['ip']).map(parseKeyPart),
		rate: limit?.rate ?? 100,
		window: limit?.window ?? '1m',
		algorithm: limit?.algorithm ?? 'fixed',
		mode: limit?.mode ?? 'enforce',
		status: limit?.status ?? DEFAULT_LIMIT_STATUS,
		message: limit?.message ?? DEFAULT_LIMIT_MESSAGE,
		filter: limit?.filter ?? ''
	}
}

/**
 * Generate a stable, unique limit id that doesn't collide with `taken`.
 */
export function genLimitId (taken: string[]): string {
	let id
	do {
		id = 'limit-' + Math.random().toString(36).slice(2, 8)
	} while (taken.includes(id))
	return id
}

/**
 * Map API limits to form rows, giving every row a unique id.
 */
export function normalizeLimits (apiLimits?: Api.WafLimit[]): LimitForm[] {
	const taken: string[] = []
	return (apiLimits ?? []).map((l) => {
		const f = limitForm(l)
		if (!f.id || taken.includes(f.id)) f.id = genLimitId(taken)
		taken.push(f.id)
		return f
	})
}

/**
 * Map form rows back to the API limit shape. Key rows are deduped (and
 * incomplete header/cookie rows dropped), falling back to ['ip'] when nothing
 * valid remains.
 */
export function toApiLimits (limits: LimitForm[]): Api.WafLimit[] {
	return limits.map((l) => {
		const key: string[] = []
		for (const row of l.key) {
			const part = keyRowToApi(row)
			if (part && !key.includes(part)) key.push(part)
		}
		if (key.length === 0) key.push('ip')

		return {
			id: l.id,
			description: l.description,
			key,
			rate: Number(l.rate) || 1,
			window: l.window,
			algorithm: l.algorithm === 'sliding' ? 'sliding' : 'fixed',
			mode: l.mode === 'shadow' ? 'shadow' : 'enforce',
			status: Number(l.status) === 503 ? 503 : DEFAULT_LIMIT_STATUS,
			message: l.message || DEFAULT_LIMIT_MESSAGE,
			filter: (l.filter ?? '').trim()
		}
	})
}
