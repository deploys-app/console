// Shared rate-limit helpers for the firewall manage + limit edit pages. Limit
// ids are auto-generated and stable for the life of a limit (like rule ids),
// but limits have no priority — order doesn't matter.

/**
 * One characteristic of the bucket key. Header/cookie carry a name; the rest
 * round-trip as a bare keyword ('ip', 'host', 'country', 'asn').
 * @typedef {Object} KeyRow
 * @property {'ip' | 'host' | 'country' | 'asn' | 'header' | 'cookie'} type
 * @property {string} name
 */

/**
 * @typedef {Object} LimitForm
 * @property {string} id
 * @property {string} description
 * @property {KeyRow[]} key
 * @property {number} rate
 * @property {string} window
 * @property {'fixed' | 'sliding'} algorithm
 * @property {'enforce' | 'shadow'} mode
 * @property {number} status
 * @property {string} message
 */

export const DEFAULT_LIMIT_STATUS = 429
export const DEFAULT_LIMIT_MESSAGE = 'Too Many Requests'

/** @type {Record<string, string>} */
export const modeLabels = {
	enforce: 'Enforce',
	shadow: 'Shadow'
}

/** @type {Record<KeyRow['type'], string>} */
export const keyTypeLabels = {
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
/** @type {{ value: string, label: string }[]} */
export const windowOptions = [
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
 * @param {string} part
 * @returns {KeyRow}
 */
export function parseKeyPart (part) {
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
 * @param {KeyRow} row
 * @returns {string}
 */
export function keyRowToApi (row) {
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
 * @param {string[]} [key]
 * @returns {string}
 */
export function describeKey (key) {
	const parts = (key && key.length > 0 ? key : ['ip']).map((part) => {
		const row = parseKeyPart(part)
		if (row.type === 'header' || row.type === 'cookie') {
			return `${keyTypeLabels[row.type]} ${row.name}`
		}
		return row.type === 'ip' ? 'IP' : keyTypeLabels[row.type]
	})
	return parts.join(' + ')
}

/**
 * @param {Api.WafLimit} [limit]
 * @returns {LimitForm}
 */
export function limitForm (limit) {
	return {
		id: limit?.id ?? '',
		description: limit?.description ?? '',
		key: (limit?.key?.length ? limit.key : ['ip']).map(parseKeyPart),
		rate: limit?.rate ?? 100,
		window: limit?.window ?? '1m',
		algorithm: limit?.algorithm ?? 'fixed',
		mode: limit?.mode ?? 'enforce',
		status: limit?.status ?? DEFAULT_LIMIT_STATUS,
		message: limit?.message ?? DEFAULT_LIMIT_MESSAGE
	}
}

/**
 * Generate a stable, unique limit id that doesn't collide with `taken`.
 * @param {string[]} taken
 * @returns {string}
 */
export function genLimitId (taken) {
	let id
	do {
		id = 'limit-' + Math.random().toString(36).slice(2, 8)
	} while (taken.includes(id))
	return id
}

/**
 * Map API limits to form rows, giving every row a unique id.
 * @param {Api.WafLimit[]} [apiLimits]
 * @returns {LimitForm[]}
 */
export function normalizeLimits (apiLimits) {
	/** @type {string[]} */
	const taken = []
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
 * @param {LimitForm[]} limits
 * @returns {Api.WafLimit[]}
 */
export function toApiLimits (limits) {
	return limits.map((l) => {
		/** @type {string[]} */
		const key = []
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
			message: l.message || DEFAULT_LIMIT_MESSAGE
		}
	})
}
