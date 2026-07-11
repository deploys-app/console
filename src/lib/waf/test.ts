// Shared helpers for the firewall test panel (waf.test dry runs): the sample
// request form model, its mapping to the RPC payload, and result phrasing.

export interface KvRow {
	k: string
	v: string
}

export interface SampleForm {
	method: string
	path: string
	host: string
	query: string
	scheme: string
	ip: string
	country: string
	asn: string
	headers: KvRow[]
	cookies: KvRow[]
}

export const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
	.map((m) => ({ value: m, label: m }))

export const schemeOptions = [
	{ value: 'https', label: 'https' },
	{ value: 'http', label: 'http' }
]

export function defaultSample (): SampleForm {
	return {
		method: 'GET',
		path: '/',
		host: '',
		query: '',
		scheme: 'https',
		ip: '',
		country: '',
		asn: '',
		headers: [],
		cookies: []
	}
}

// Last-used sample, kept in module state so re-opening a panel (or moving
// between the rule/limit editors) reuses the previous sample within one SPA
// session. Deliberately not persisted.
let lastSample: SampleForm | null = null

export function seedSample (): SampleForm {
	return lastSample ? clone(lastSample) : defaultSample()
}

export function rememberSample (form: SampleForm): void {
	lastSample = clone(form)
}

// JSON round-trip (not structuredClone) so $state proxies clone cleanly.
function clone (form: SampleForm): SampleForm {
	return JSON.parse(JSON.stringify(form)) as SampleForm
}

/**
 * Map key/value rows to the wire map: trimmed names, empty names dropped,
 * later duplicates win. Header names are lowercased (the engine's request map
 * is lowercase-keyed); cookie names keep their spelling (cookies match
 * case-sensitively).
 */
function rowsToMap (rows: KvRow[], lowercaseNames = false): Record<string, string> {
	const out: Record<string, string> = {}
	for (const { k, v } of rows) {
		let name = k.trim()
		if (lowercaseNames) name = name.toLowerCase()
		if (!name) continue
		out[name] = v
	}
	return out
}

/**
 * Map the form model to the waf.test sample request. Path falls back to '/'
 * and is anchored so the server-side "must start with /" validation can't
 * trip on casual input.
 */
export function toWafTestRequest (form: SampleForm): Api.WafTestRequest {
	const path = form.path.trim() || '/'
	return {
		method: form.method,
		path: path.startsWith('/') ? path : `/${path}`,
		query: form.query.trim().replace(/^\?/, ''),
		host: form.host.trim(),
		scheme: form.scheme,
		headers: rowsToMap(form.headers, true),
		cookies: rowsToMap(form.cookies),
		ip: form.ip.trim(),
		country: form.country,
		asn: Number(form.asn) || 0
	}
}

/**
 * One-line banner phrasing for the dry-run outcome.
 */
export function outcomeText (r: Api.WafTestResult): string {
	switch (r.outcome) {
	case 'block':
		return `Blocked by rule ${r.winningRuleId} — ${r.status} ${r.message}`
	case 'allow':
		return `Allowed by rule ${r.winningRuleId}`
	default:
		return 'Passed — no rule terminated this request'
	}
}

/**
 * Per-limit phrasing keyed off `counted`: whether the request would actually
 * be counted against the limit (a rule-blocked request never reaches the rate
 * limiter). Errors are rendered separately by the panel.
 */
export function limitNote (l: Api.WafTestLimitResult, r: Api.WafTestResult): string {
	if (l.error) return ''
	if (l.counted) return 'Counts toward this limit.'
	if (l.filterMatched) return `Matches the filter — not counted (request blocked by rule ${r.winningRuleId}).`
	return 'Filter does not match this request.'
}
