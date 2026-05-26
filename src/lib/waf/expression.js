// WAF expression builder. Generates a single CEL condition from a structured
// spec, using ONLY the portable parapet helper functions (containsAny,
// hasPrefixAny, regexMatch, ipInCidr, lower, urlDecode) — never the
// `.startsWith`/`.contains`/`.matches` string methods, which aren't guaranteed
// across parapet's Go + Rust engines.
//
// This module is a pure, side-effect-free helper so it can be unit-tested and
// the modal UI stays thin.

/**
 * Escape a JS string for use inside a CEL double-quoted string literal.
 * @param {string} v
 * @returns {string} the inner contents (no surrounding quotes)
 */
export function celString (v) {
	return String(v ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
}

/** @param {string} v */
function quote (v) {
	return `"${celString(v)}"`
}

/**
 * @typedef {'string' | 'ip' | 'numeric' | 'tls'} FieldType
 */

/**
 * @typedef {Object} FieldMeta
 * @property {string} value         stable key used in the spec
 * @property {string} label         human label shown in the Select
 * @property {FieldType} type       drives which operators/options apply
 * @property {boolean} [hasName]    true → field needs an extra name input (header/arg/cookie)
 * @property {string} [accessor]    fixed CEL accessor (fields without a name)
 * @property {string} [accessorMap] CEL map accessor template, `<name>` replaced (fields with a name)
 * @property {string[]} [suggestions] free-text combobox suggestions (datalist) for equals/not_equals
 */

/** @type {FieldMeta[]} */
export const fields = [
	{ value: 'method', label: 'Method', type: 'string', accessor: 'request.method', suggestions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
	{ value: 'path', label: 'Path', type: 'string', accessor: 'request.path' },
	{ value: 'host', label: 'Host', type: 'string', accessor: 'request.host' },
	{ value: 'query', label: 'Query string', type: 'string', accessor: 'request.query' },
	{ value: 'uri', label: 'URI', type: 'string', accessor: 'request.uri' },
	{ value: 'scheme', label: 'Scheme', type: 'tls', accessor: 'request.scheme' },
	{ value: 'user_agent', label: 'User-Agent', type: 'string', accessor: 'request.user_agent' },
	{ value: 'referer', label: 'Referer', type: 'string', accessor: 'request.referer' },
	{ value: 'remote_ip', label: 'Remote IP', type: 'ip', accessor: 'request.remote_ip' },
	{ value: 'content_length', label: 'Content-Length', type: 'numeric', accessor: 'request.content_length' },
	{ value: 'header', label: 'Header', type: 'string', hasName: true, accessorMap: 'request.headers["<name>"]' },
	{ value: 'arg', label: 'Query arg', type: 'string', hasName: true, accessorMap: 'request.args["<name>"]' },
	{ value: 'cookie', label: 'Cookie', type: 'string', hasName: true, accessorMap: 'request.cookies["<name>"]' }
]

/** @type {Record<string, FieldMeta>} */
const fieldByValue = Object.fromEntries(fields.map((f) => [f.value, f]))

/** @param {string} value @returns {FieldMeta | undefined} */
export function getField (value) {
	return fieldByValue[value]
}

/**
 * @typedef {Object} OperatorMeta
 * @property {string} value
 * @property {string} label
 * @property {boolean} [multi]  true → operand is a list of values (textarea)
 */

/** @type {OperatorMeta[]} */
const stringOperators = [
	{ value: 'equals', label: 'equals' },
	{ value: 'not_equals', label: 'not equals' },
	{ value: 'contains_any', label: 'contains any of', multi: true },
	{ value: 'starts_with_any', label: 'starts with any of', multi: true },
	{ value: 'matches_regex', label: 'matches regex' }
]

/** @type {OperatorMeta[]} */
const ipOperators = [
	{ value: 'in_cidr', label: 'in CIDR' },
	{ value: 'ip_equals', label: 'equals' }
]

/** @type {OperatorMeta[]} */
const numericOperators = [
	{ value: 'num_eq', label: '==' },
	{ value: 'num_ne', label: '!=' },
	{ value: 'num_lt', label: '<' },
	{ value: 'num_gt', label: '>' },
	{ value: 'num_le', label: '<=' },
	{ value: 'num_ge', label: '>=' }
]

/** @type {Record<string, string>} */
const numericOps = {
	num_eq: '==',
	num_ne: '!=',
	num_lt: '<',
	num_gt: '>',
	num_le: '<=',
	num_ge: '>='
}

/**
 * Operators available for a given field type.
 * @param {FieldType} type
 * @returns {OperatorMeta[]}
 */
export function operatorsForType (type) {
	switch (type) {
	case 'ip': return ipOperators
	case 'numeric': return numericOperators
	case 'tls': return []
	default: return stringOperators
	}
}

/** @param {string} op */
export function isMultiOperator (op) {
	return op === 'contains_any' || op === 'starts_with_any'
}

/**
 * Split a multi-value input into a clean list. Accepts newline- or
 * comma-separated values; trims each and drops the empties.
 * @param {string} raw
 * @returns {string[]}
 */
export function parseList (raw) {
	return String(raw ?? '')
		.split(/[\n,]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

/**
 * @typedef {Object} ExpressionSpec
 * @property {string} field            field key (see `fields`)
 * @property {string} [name]           name for header/arg/cookie fields
 * @property {string} operator         operator key
 * @property {string} [value]          single operand (equals/regex/cidr/numeric)
 * @property {string} [values]         raw multi-value text (any-of operators)
 * @property {boolean} [tls]           TLS on/off for a `'tls'` field (https vs http)
 */

/**
 * Resolve the raw CEL accessor for a spec's field (no transforms applied).
 * @param {ExpressionSpec} spec
 * @returns {string}
 */
function resolveAccessor (spec) {
	const f = fieldByValue[spec.field]
	if (!f) return ''
	if (f.hasName) {
		return (f.accessorMap ?? '').replace('<name>', celString((spec.name ?? '').toLowerCase()))
	}
	return f.accessor ?? ''
}

/**
 * Build a single CEL condition from a structured spec.
 *
 * Returns an empty string when the spec is incomplete (e.g. missing value, an
 * empty any-of list, or a name-bearing field with no name) so the caller can
 * disable Insert.
 *
 * @param {ExpressionSpec} spec
 * @returns {string}
 */
export function buildExpression (spec) {
	const f = fieldByValue[spec.field]
	if (!f) return ''
	if (f.hasName && !(spec.name ?? '').trim()) return ''

	const accessor = resolveAccessor(spec)
	if (!accessor) return ''

	/** @type {string} */
	let snippet

	if (f.type === 'tls') {
		// TLS on/off toggle — ignore the operator. ON → https, OFF → http.
		snippet = `${accessor} == ${quote(spec.tls === false ? 'http' : 'https')}`
	} else if (f.type === 'numeric') {
		const op = numericOps[spec.operator]
		const raw = (spec.value ?? '').trim()
		if (!op || raw === '' || !/^-?\d+$/.test(raw)) return ''
		snippet = `${accessor} ${op} ${raw}`
	} else if (f.type === 'ip') {
		const v = (spec.value ?? '').trim()
		if (!v) return ''
		if (spec.operator === 'in_cidr') {
			snippet = `ipInCidr(${accessor}, ${quote(v)})`
		} else if (spec.operator === 'ip_equals') {
			snippet = `${accessor} == ${quote(v)}`
		} else {
			return ''
		}
	} else {
		// string field
		if (isMultiOperator(spec.operator)) {
			const list = parseList(spec.values ?? '')
			if (list.length === 0) return ''
			const items = list.map((v) => quote(v)).join(', ')
			const fn = spec.operator === 'contains_any' ? 'containsAny' : 'hasPrefixAny'
			snippet = `${fn}(${accessor}, [${items}])`
		} else if (spec.operator === 'matches_regex') {
			const pattern = spec.value ?? ''
			if (pattern === '') return ''
			snippet = `regexMatch(${accessor}, ${quote(pattern)})`
		} else {
			const v = spec.value ?? ''
			if (v === '') return ''
			const op = spec.operator === 'not_equals' ? '!=' : '=='
			snippet = `${accessor} ${op} ${quote(v)}`
		}
	}

	if (!snippet) return ''
	return snippet
}

/**
 * Combine a generated snippet with an existing expression.
 * @param {string} existing
 * @param {string} snippet
 * @param {'and' | 'or' | 'replace'} mode
 * @returns {string}
 */
export function combineExpression (existing, snippet, mode) {
	const e = (existing ?? '').trim()
	if (!e || mode === 'replace') return snippet
	if (mode === 'or') return `${e} || ${snippet}`
	return `${e} && ${snippet}`
}
