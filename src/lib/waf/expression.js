// WAF expression builder. Generates a single CEL condition from a structured
// spec. "Contains any of" uses parapet's containsAny list helper so a whole list
// matches in one call; the prefix/suffix operators use the standard CEL string
// methods `startsWith` / `endsWith` (with a leading `!` for the negated "not …"
// variants), `regexMatch` covers regex, and `ipInCidr` covers CIDR. Other
// available transforms are lower / upper / urlDecode.
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
 * @typedef {'string' | 'ip' | 'numeric' | 'tls' | 'country' | 'asn'} FieldType
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
	{ value: 'country', label: 'Country', type: 'country', accessor: 'request.country' },
	{ value: 'asn', label: 'ASN', type: 'asn', accessor: 'request.asn' },
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
	{ value: 'in_list', label: 'is in', multi: true },
	{ value: 'not_in_list', label: 'is not in', multi: true },
	{ value: 'contains_any', label: 'contains any of', multi: true },
	{ value: 'starts_with', label: 'starts with' },
	{ value: 'not_starts_with', label: 'not starts with' },
	{ value: 'ends_with', label: 'ends with' },
	{ value: 'not_ends_with', label: 'not ends with' },
	{ value: 'matches_regex', label: 'matches regex' }
]

/**
 * String operators backed by a standard CEL string method. `negate` wraps the
 * call in a leading `!`. Single source of truth for both the generator and the
 * inverse parser (`operatorByMethod`).
 * @type {Record<string, { method: 'startsWith' | 'endsWith', negate: boolean }>}
 */
const methodOperators = {
	starts_with: { method: 'startsWith', negate: false },
	not_starts_with: { method: 'startsWith', negate: true },
	ends_with: { method: 'endsWith', negate: false },
	not_ends_with: { method: 'endsWith', negate: true }
}

/** Reverse of `methodOperators`, keyed `"<method>:<negate>"`. */
const operatorByMethod = Object.fromEntries(
	Object.entries(methodOperators).map(([op, m]) => [`${m.method}:${m.negate}`, op])
)

/** @type {OperatorMeta[]} */
const ipOperators = [
	{ value: 'in_cidr', label: 'in CIDR' },
	{ value: 'ip_equals', label: 'equals' }
]

/**
 * Operators for fields matched by exact value or list membership (country code,
 * ASN). `in_list` / `not_in_list` build a CEL `in […]` membership; the field
 * type decides whether operands are quoted (country) or raw ints (asn).
 * @type {OperatorMeta[]}
 */
const membershipOperators = [
	{ value: 'equals', label: 'equals' },
	{ value: 'not_equals', label: 'not equals' },
	{ value: 'in_list', label: 'is in', multi: true },
	{ value: 'not_in_list', label: 'is not in', multi: true }
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
	case 'country': return membershipOperators
	case 'asn': return membershipOperators
	case 'tls': return []
	default: return stringOperators
	}
}

/**
 * Operators available for a specific field. Same as `operatorsForType` for most
 * fields, but the HTTP method is a closed set of tokens (GET/POST/…), so only
 * exact-match and list membership make sense — prefix/suffix/regex/contains are
 * not offered.
 * @param {FieldMeta | undefined} field
 * @returns {OperatorMeta[]}
 */
export function operatorsForField (field) {
	if (!field) return stringOperators
	if (field.value === 'method') return membershipOperators
	return operatorsForType(field.type)
}

/** @param {string} op */
export function isMultiOperator (op) {
	return op === 'contains_any' || op === 'in_list' || op === 'not_in_list'
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
	} else if (f.type === 'country') {
		// Country code (ISO 3166-1 alpha-2). Membership uses CEL's `in` operator
		// over a string list; "is not any of" negates the whole `in` with `!(…)`.
		if (spec.operator === 'in_list' || spec.operator === 'not_in_list') {
			const list = parseList(spec.values ?? '')
			if (list.length === 0) return ''
			const items = list.map((v) => quote(v)).join(', ')
			const inExpr = `${accessor} in [${items}]`
			snippet = spec.operator === 'not_in_list' ? `!(${inExpr})` : inExpr
		} else {
			const v = (spec.value ?? '').trim()
			if (v === '') return ''
			const op = spec.operator === 'not_equals' ? '!=' : '=='
			snippet = `${accessor} ${op} ${quote(v)}`
		}
	} else if (f.type === 'asn') {
		// Autonomous system number — integer operands (unquoted). Membership uses
		// CEL's `in` operator; "is not in" negates the whole `in` with `!(…)`.
		if (spec.operator === 'in_list' || spec.operator === 'not_in_list') {
			const list = parseList(spec.values ?? '').filter((v) => /^\d+$/.test(v))
			if (list.length === 0) return ''
			const inExpr = `${accessor} in [${list.join(', ')}]`
			snippet = spec.operator === 'not_in_list' ? `!(${inExpr})` : inExpr
		} else {
			const raw = (spec.value ?? '').trim()
			if (!/^\d+$/.test(raw)) return ''
			const op = spec.operator === 'not_equals' ? '!=' : '=='
			snippet = `${accessor} ${op} ${raw}`
		}
	} else {
		// string field
		if (isMultiOperator(spec.operator)) {
			const list = parseList(spec.values ?? '')
			if (list.length === 0) return ''
			const items = list.map((v) => quote(v)).join(', ')
			if (spec.operator === 'contains_any') {
				snippet = `containsAny(${accessor}, [${items}])`
			} else {
				// in_list / not_in_list — CEL `in` membership over a string list.
				const inExpr = `${accessor} in [${items}]`
				snippet = spec.operator === 'not_in_list' ? `!(${inExpr})` : inExpr
			}
		} else if (methodOperators[spec.operator]) {
			// Prefix/suffix match via the standard CEL string method, negated with
			// a leading `!` for the "not …" variants.
			const v = spec.value ?? ''
			if (v === '') return ''
			const { method, negate } = methodOperators[spec.operator]
			snippet = `${negate ? '!' : ''}${accessor}.${method}(${quote(v)})`
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

/**
 * @typedef {'and' | 'or'} Combinator
 */

/**
 * @typedef {Object} ExpressionGroup
 * @property {Combinator} combinator
 * @property {ExpressionSpec[]} conditions
 */

/**
 * Build a flat group of conditions joined by a single boolean operator. This is
 * the multi-condition counterpart to `buildExpression` and the exact string
 * `parseExpression` is the inverse of.
 * @param {Combinator} combinator
 * @param {ExpressionSpec[]} conditions
 * @returns {string}
 */
export function buildGroup (combinator, conditions) {
	return (conditions ?? [])
		.map(buildExpression)
		.filter(Boolean)
		.join(combinator === 'or' ? ' || ' : ' && ')
}

/**
 * Un-escape the inner contents of a CEL double-quoted string literal. Exact
 * inverse of `celString` (reverses `\\ \" \n \r \t`).
 * @param {string} inner  contents between the surrounding quotes
 * @returns {string}
 */
function unescapeCelString (inner) {
	let out = ''
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i]
		if (c !== '\\') {
			out += c
			continue
		}
		const next = inner[i + 1]
		switch (next) {
		case '\\': out += '\\'; break
		case '"': out += '"'; break
		case 'n': out += '\n'; break
		case 'r': out += '\r'; break
		case 't': out += '\t'; break
		default: out += next ?? ''
		}
		i++
	}
	return out
}

/**
 * Match a single double-quoted CEL string literal at the START of `s`. Returns
 * the decoded value and the index just past the closing quote, or `null` if `s`
 * doesn't begin with a well-formed literal. Honours `\"`/`\\` escapes.
 * @param {string} s
 * @returns {{ value: string, end: number } | null}
 */
function matchStringLiteral (s) {
	if (s[0] !== '"') return null
	let i = 1
	let inner = ''
	while (i < s.length) {
		const c = s[i]
		if (c === '\\') {
			// Keep the escape sequence verbatim for un-escaping below.
			if (i + 1 >= s.length) return null
			inner += c + s[i + 1]
			i += 2
			continue
		}
		if (c === '"') {
			return { value: unescapeCelString(inner), end: i + 1 }
		}
		inner += c
		i++
	}
	return null
}

/**
 * Split a CEL expression into its top-level conjuncts, respecting string
 * literals, `[...]` brackets, and `(...)` parens. Only splits on ` && ` / ` || `
 * found at depth 0 outside strings.
 *
 * Returns `{ parts, op }` where `op` is the single boolean operator seen
 * (`'and'`, `'or'`, or `null` for a single part). Returns `null` when BOTH `&&`
 * and `||` appear at the top level (a "complex" expression).
 * @param {string} s
 * @returns {{ parts: string[], op: Combinator | null } | null}
 */
function splitTopLevel (s) {
	/** @type {string[]} */
	const parts = []
	/** @type {Combinator | null} */
	let op = null
	let depth = 0
	let start = 0
	let i = 0
	while (i < s.length) {
		const c = s[i]
		if (c === '"') {
			const m = matchStringLiteral(s.slice(i))
			if (!m) return null // unterminated string → not representable
			i += m.end
			continue
		}
		if (c === '[' || c === '(') {
			depth++
			i++
			continue
		}
		if (c === ']' || c === ')') {
			depth--
			if (depth < 0) return null
			i++
			continue
		}
		if (depth === 0 && (c === '&' || c === '|')) {
			// Only a delimiter when it's exactly ` && ` / ` || ` (surrounded by
			// single spaces, matching the generator's output).
			const two = s.slice(i, i + 2)
			if ((two === '&&' || two === '||') && s[i - 1] === ' ' && s[i + 2] === ' ') {
				const here = two === '&&' ? 'and' : 'or'
				if (op && op !== here) return null // mixed && / || → complex
				op = here
				parts.push(s.slice(start, i - 1))
				i += 3
				start = i
				continue
			}
		}
		i++
	}
	if (depth !== 0) return null
	parts.push(s.slice(start))
	return { parts, op }
}

/** Map a fixed CEL accessor back to its field key. */
const fieldByAccessor = Object.fromEntries(
	fields.filter((f) => f.accessor).map((f) => [f.accessor, f.value])
)

/** Map a named-map field's `request.xxx[` prefix back to its field key. */
const nameFieldByPrefix = Object.fromEntries(
	fields
		.filter((f) => f.hasName && f.accessorMap)
		.map((f) => [(f.accessorMap ?? '').split('["<name>"]')[0], f.value])
)

/**
 * Parse a single accessor at the START of `s` (a fixed `request.x` accessor or a
 * named `request.headers["name"]` form). Returns the resolved field key, the
 * optional decoded name, and the index just past the accessor — or `null`.
 * @param {string} s
 * @returns {{ field: string, name?: string, end: number } | null}
 */
function matchAccessor (s) {
	// Named map accessor: `request.headers["..."]` etc. Try these first since the
	// fixed-accessor table has no overlap with the map prefixes.
	for (const prefix of Object.keys(nameFieldByPrefix)) {
		if (!s.startsWith(prefix + '["')) continue
		const lit = matchStringLiteral(s.slice(prefix.length + 1))
		if (!lit) return null
		const afterName = prefix.length + 1 + lit.end
		if (s[afterName] !== ']') return null
		return { field: nameFieldByPrefix[prefix], name: lit.value, end: afterName + 1 }
	}
	// Fixed accessors — pick the longest matching one so e.g. `request.host`
	// isn't shadowed by a shorter prefix (none currently overlap, but be safe).
	/** @type {string | null} */
	let best = null
	for (const accessor of Object.keys(fieldByAccessor)) {
		if (s.startsWith(accessor) && (!best || accessor.length > best.length)) best = accessor
	}
	if (!best) return null
	// The accessor must be followed by a boundary (space, operator, `.` method
	// call, or end) so a fixed accessor isn't matched as a prefix of something
	// longer.
	const next = s[best.length]
	if (next !== undefined && next !== ' ' && next !== ')' && next !== ',' && next !== '.') return null
	return { field: fieldByAccessor[best], end: best.length }
}

/**
 * Parse the bracketed, comma-separated quoted list at the START of `s`
 * (`["a", "b"]` exactly as the generator emits). Returns the decoded items and
 * the consumed length, or `null` when malformed.
 * @param {string} s
 * @returns {{ items: string[], end: number } | null}
 */
function matchList (s) {
	if (s[0] !== '[') return null
	let i = 1
	/** @type {string[]} */
	const items = []
	// Empty list is never emitted (buildExpression returns '' for it).
	while (true) {
		const lit = matchStringLiteral(s.slice(i))
		if (!lit) return null
		items.push(lit.value)
		i += lit.end
		if (s[i] === ']') return items.length ? { items, end: i + 1 } : null
		if (s.slice(i, i + 2) !== ', ') return null
		i += 2
	}
}

/**
 * Parse the bracketed, comma-separated integer list at the START of `s`
 * (`[13335, 16509]` exactly as the generator emits). Returns the items (as
 * strings) and the consumed length, or `null` when malformed.
 * @param {string} s
 * @returns {{ items: string[], end: number } | null}
 */
function matchIntList (s) {
	if (s[0] !== '[') return null
	let i = 1
	/** @type {string[]} */
	const items = []
	// Empty list is never emitted (buildExpression returns '' for it).
	while (true) {
		const m = /^\d+/.exec(s.slice(i))
		if (!m) return null
		items.push(m[0])
		i += m[0].length
		if (s[i] === ']') return items.length ? { items, end: i + 1 } : null
		if (s.slice(i, i + 2) !== ', ') return null
		i += 2
	}
}

/**
 * Parse the `<accessor>.startsWith("v")` / `.endsWith("v")` method forms — each
 * optionally negated with a leading `!` (the "not …" operators). String fields
 * only. Returns the spec or `null`.
 * @param {string} s
 * @returns {ExpressionSpec | null}
 */
function parseMethodCall (s) {
	let negate = false
	let body = s
	if (body.startsWith('!')) {
		negate = true
		body = body.slice(1)
	}
	const acc = matchAccessor(body)
	if (!acc) return null
	const field = getField(acc.field)
	if (!field || field.type !== 'string') return null
	const rest = body.slice(acc.end)
	/** @type {'startsWith' | 'endsWith' | null} */
	let method = null
	if (rest.startsWith('.startsWith(')) method = 'startsWith'
	else if (rest.startsWith('.endsWith(')) method = 'endsWith'
	if (!method) return null
	const inner = rest.slice(method.length + 2) // ".<method>(" → '.' + method + '('
	const lit = matchStringLiteral(inner)
	if (!lit || inner.slice(lit.end) !== ')') return null
	const operator = operatorByMethod[`${method}:${negate}`]
	if (!operator) return null
	return {
		field: acc.field,
		...(acc.name !== undefined ? { name: acc.name } : {}),
		operator,
		value: lit.value
	}
}

/**
 * Parse exactly one CEL condition (a single conjunct) back into an
 * `ExpressionSpec`. Strict: only forms `buildExpression` can emit are accepted.
 * Returns `null` for anything else.
 * @param {string} part
 * @returns {ExpressionSpec | null}
 */
function parseCondition (part) {
	const s = part.trim()
	if (!s) return null

	// Method-call forms: `<accessor>.startsWith("v")` / `.endsWith("v")`, each
	// optionally negated with a leading `!`.
	const method = parseMethodCall(s)
	if (method) return method

	// Negated membership: `!(<accessor> in [...])` → `not_in_list`.
	if (s.startsWith('!(') && s.endsWith(')')) {
		const inner = parseCondition(s.slice(2, -1))
		if (inner && inner.operator === 'in_list') return { ...inner, operator: 'not_in_list' }
		return null
	}

	// Function-call forms: containsAny / regexMatch / ipInCidr.
	const fnMatch = /^(containsAny|regexMatch|ipInCidr)\(/.exec(s)
	if (fnMatch) {
		const fn = fnMatch[1]
		const acc = matchAccessor(s.slice(fn.length + 1))
		if (!acc) return null
		let i = fn.length + 1 + acc.end
		if (s.slice(i, i + 2) !== ', ') return null
		i += 2
		if (fn === 'containsAny') {
			const list = matchList(s.slice(i))
			if (!list) return null
			i += list.end
			if (s.slice(i) !== ')') return null
			return {
				field: acc.field,
				...(acc.name !== undefined ? { name: acc.name } : {}),
				operator: 'contains_any',
				values: list.items.join('\n')
			}
		}
		// regexMatch / ipInCidr take a single string operand.
		const lit = matchStringLiteral(s.slice(i))
		if (!lit) return null
		i += lit.end
		if (s.slice(i) !== ')') return null
		if (fn === 'regexMatch') {
			return {
				field: acc.field,
				...(acc.name !== undefined ? { name: acc.name } : {}),
				operator: 'matches_regex',
				value: lit.value
			}
		}
		// ipInCidr — accessor must be the remote_ip field.
		if (acc.field !== 'remote_ip') return null
		return { field: 'remote_ip', operator: 'in_cidr', value: lit.value }
	}

	// Infix forms: `<accessor> <op> <operand>`.
	const acc = matchAccessor(s)
	if (!acc) return null
	let rest = s.slice(acc.end)
	const field = getField(acc.field)
	if (!field) return null

	if (field.type === 'numeric') {
		// `request.content_length <op> <int>` — op ∈ ==,!=,<,>,<=,>=.
		const m = /^ (==|!=|<=|>=|<|>) (-?\d+)$/.exec(rest)
		if (!m) return null
		const opKey = Object.keys(numericOps).find((k) => numericOps[k] === m[1])
		if (!opKey) return null
		return { field: acc.field, operator: opKey, value: m[2] }
	}

	if (field.type === 'country') {
		// `request.country in ["..", ".."]` (membership) or `== "X"` / `!= "X"`.
		if (rest.startsWith(' in ')) {
			const list = matchList(rest.slice(4))
			if (!list || 4 + list.end !== rest.length) return null
			return { field: acc.field, operator: 'in_list', values: list.items.join('\n') }
		}
		const m = /^ (==|!=) /.exec(rest)
		if (!m) return null
		const lit = matchStringLiteral(rest.slice(m[0].length))
		if (!lit || lit.end !== rest.length - m[0].length) return null
		return { field: acc.field, operator: m[1] === '!=' ? 'not_equals' : 'equals', value: lit.value }
	}

	if (field.type === 'asn') {
		// `request.asn in [13335, 16509]` (membership) or `== 13335` / `!= 13335`.
		if (rest.startsWith(' in ')) {
			const list = matchIntList(rest.slice(4))
			if (!list || 4 + list.end !== rest.length) return null
			return { field: acc.field, operator: 'in_list', values: list.items.join('\n') }
		}
		const m = /^ (==|!=) (\d+)$/.exec(rest)
		if (!m) return null
		return { field: acc.field, operator: m[1] === '!=' ? 'not_equals' : 'equals', value: m[2] }
	}

	if (field.type === 'tls') {
		// `request.scheme == "https"` (TLS on) / `"http"` (TLS off).
		if (!rest.startsWith(' == ')) return null
		const lit = matchStringLiteral(rest.slice(4))
		if (!lit || lit.end !== rest.length - 4) return null
		if (lit.value === 'https') return { field: 'scheme', operator: 'equals', tls: true }
		if (lit.value === 'http') return { field: 'scheme', operator: 'equals', tls: false }
		return null
	}

	if (field.type === 'ip') {
		// Only `request.remote_ip == "ip"` reaches here (in_cidr is a fn above).
		if (!rest.startsWith(' == ')) return null
		const lit = matchStringLiteral(rest.slice(4))
		if (!lit || lit.end !== rest.length - 4) return null
		return { field: 'remote_ip', operator: 'ip_equals', value: lit.value }
	}

	// string field: `<acc> in ["a", "b"]` membership, or `== "v"` / `!= "v"`.
	if (rest.startsWith(' in ')) {
		const list = matchList(rest.slice(4))
		if (!list || 4 + list.end !== rest.length) return null
		return {
			field: acc.field,
			...(acc.name !== undefined ? { name: acc.name } : {}),
			operator: 'in_list',
			values: list.items.join('\n')
		}
	}
	const opMatch = /^ (==|!=) /.exec(rest)
	if (!opMatch) return null
	rest = rest.slice(opMatch[0].length)
	const lit = matchStringLiteral(rest)
	if (!lit || lit.end !== rest.length) return null
	return {
		field: acc.field,
		...(acc.name !== undefined ? { name: acc.name } : {}),
		operator: opMatch[1] === '!=' ? 'not_equals' : 'equals',
		value: lit.value
	}
}

/**
 * Conservative inverse of `buildGroup`/`buildExpression`. Parses a CEL string
 * into a flat group of structured conditions joined by a single boolean
 * operator, or returns `null` when the string is not EXACTLY representable by
 * the visual builder (mixed `&&`/`||`, grouping, unknown functions, wrappers,
 * malformed input). A false "complex" is acceptable; a wrong parse is not.
 *
 * @param {string} cel
 * @returns {ExpressionGroup | null}
 */
export function parseExpression (cel) {
	const trimmed = String(cel ?? '').trim()
	if (trimmed === '') return { combinator: 'and', conditions: [] }

	const split = splitTopLevel(trimmed)
	if (!split) return null

	/** @type {ExpressionSpec[]} */
	const conditions = []
	for (const part of split.parts) {
		const spec = parseCondition(part)
		if (!spec) return null
		conditions.push(spec)
	}

	return { combinator: split.op ?? 'and', conditions }
}
