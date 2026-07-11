// WAF expression builder. Generates a single CEL condition from a structured
// spec. "Contains any of" uses parapet's containsAny list helper so a whole list
// matches in one call; the prefix/suffix operators use the standard CEL string
// methods `startsWith` / `endsWith` (with a leading `!` for the negated "not …"
// variants), `regexMatch` covers regex, and `ipInCidr` covers CIDR. Other
// available transforms are lower / upper / urlDecode.
//
// This module is a pure, side-effect-free helper so it can be unit-tested and
// the modal UI stays thin.
//
// `ipInList(<field>, "<list-name>")` is a PLATFORM macro (see SPEC-waf-ip-lists),
// not engine CEL: the apiserver expands it into an ipInCidr || chain at
// materialization time, and the stored form is always the unexpanded macro.
// This module mirrors the api package's macro scanner (`wafListRefs`) and
// builds/parses the macro form like any other operator.

import { validListName } from '$lib/waf/lists'

/**
 * Escape a JS string for use inside a CEL double-quoted string literal. Returns
 * the inner contents (no surrounding quotes).
 */
export function celString (v: string): string {
	return String(v ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
}

function quote (v: string): string {
	return `"${celString(v)}"`
}

export type FieldType = 'string' | 'ip' | 'numeric' | 'tls' | 'country' | 'asn'

export interface FieldMeta {
	value: string // stable key used in the spec
	label: string // human label shown in the Select
	type: FieldType // drives which operators/options apply
	hasName?: boolean // true → field needs an extra name input (header/arg/cookie)
	accessor?: string // fixed CEL accessor (fields without a name)
	accessorMap?: string // CEL map accessor template, `<name>` replaced (fields with a name)
	suggestions?: string[] // free-text combobox suggestions (datalist) for equals/not_equals
}

export const fields: FieldMeta[] = [
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

const fieldByValue: Record<string, FieldMeta> = Object.fromEntries(fields.map((f) => [f.value, f]))

export function getField (value: string): FieldMeta | undefined {
	return fieldByValue[value]
}

export interface OperatorMeta {
	value: string
	label: string
	multi?: boolean // true → operand is a list of values (textarea)
	valueKind?: 'listName' // operand is a named WAF IP list (Select fed by wafList.list)
}

const stringOperators: OperatorMeta[] = [
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
 */
const methodOperators: Record<string, { method: 'startsWith' | 'endsWith', negate: boolean }> = {
	starts_with: { method: 'startsWith', negate: false },
	not_starts_with: { method: 'startsWith', negate: true },
	ends_with: { method: 'endsWith', negate: false },
	not_ends_with: { method: 'endsWith', negate: true }
}

/** Reverse of `methodOperators`, keyed `"<method>:<negate>"`. */
const operatorByMethod: Record<string, string> = Object.fromEntries(
	Object.entries(methodOperators).map(([op, m]) => [`${m.method}:${m.negate}`, op])
)

const ipOperators: OperatorMeta[] = [
	{ value: 'in_cidr', label: 'in CIDR' },
	{ value: 'ip_equals', label: 'equals' },
	// Named-list membership via the platform macro ipInList(<field>, "<name>").
	{ value: 'in_ip_list', label: 'in IP list', valueKind: 'listName' },
	{ value: 'not_in_ip_list', label: 'not in IP list', valueKind: 'listName' }
]

/**
 * Operators for fields matched by exact value or list membership (country code,
 * ASN). `in_list` / `not_in_list` build a CEL `in […]` membership; the field
 * type decides whether operands are quoted (country) or raw ints (asn).
 */
const membershipOperators: OperatorMeta[] = [
	{ value: 'equals', label: 'equals' },
	{ value: 'not_equals', label: 'not equals' },
	{ value: 'in_list', label: 'is in', multi: true },
	{ value: 'not_in_list', label: 'is not in', multi: true }
]

const numericOperators: OperatorMeta[] = [
	{ value: 'num_eq', label: '==' },
	{ value: 'num_ne', label: '!=' },
	{ value: 'num_lt', label: '<' },
	{ value: 'num_gt', label: '>' },
	{ value: 'num_le', label: '<=' },
	{ value: 'num_ge', label: '>=' }
]

const numericOps: Record<string, string> = {
	num_eq: '==',
	num_ne: '!=',
	num_lt: '<',
	num_gt: '>',
	num_le: '<=',
	num_ge: '>='
}

/**
 * Operators available for a given field type.
 */
export function operatorsForType (type: FieldType): OperatorMeta[] {
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
 */
export function operatorsForField (field: FieldMeta | undefined): OperatorMeta[] {
	if (!field) return stringOperators
	if (field.value === 'method') return membershipOperators
	return operatorsForType(field.type)
}

export function isMultiOperator (op: string): boolean {
	return op === 'contains_any' || op === 'in_list' || op === 'not_in_list'
}

/**
 * Split a multi-value input into a clean list. Accepts newline- or
 * comma-separated values; trims each and drops the empties.
 */
export function parseList (raw: string): string[] {
	return String(raw ?? '')
		.split(/[\n,]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

export interface ExpressionSpec {
	field: string // field key (see `fields`)
	name?: string // name for header/arg/cookie fields
	operator: string // operator key
	value?: string // single operand (equals/regex/cidr/numeric)
	values?: string // raw multi-value text (any-of operators)
	tls?: boolean // TLS on/off for a `'tls'` field (https vs http)
}

/**
 * Resolve the raw CEL accessor for a spec's field (no transforms applied).
 */
function resolveAccessor (spec: ExpressionSpec): string {
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
 */
export function buildExpression (spec: ExpressionSpec): string {
	const f = fieldByValue[spec.field]
	if (!f) return ''
	if (f.hasName && !(spec.name ?? '').trim()) return ''

	const accessor = resolveAccessor(spec)
	if (!accessor) return ''

	let snippet: string

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
		} else if (spec.operator === 'in_ip_list' || spec.operator === 'not_in_ip_list') {
			// The macro's name literal admits no escapes — only a valid list name
			// (the same grammar wafList.set accepts) may be spliced.
			if (!validListName(v)) return ''
			const call = `ipInList(${accessor}, "${v}")`
			snippet = spec.operator === 'not_in_ip_list' ? `!${call}` : call
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
 */
export function combineExpression (existing: string, snippet: string, mode: 'and' | 'or' | 'replace'): string {
	const e = (existing ?? '').trim()
	if (!e || mode === 'replace') return snippet
	if (mode === 'or') return `${e} || ${snippet}`
	return `${e} && ${snippet}`
}

export type Combinator = 'and' | 'or'

export interface ExpressionGroup {
	combinator: Combinator
	conditions: ExpressionSpec[]
}

/**
 * Build a flat group of conditions joined by a single boolean operator. This is
 * the multi-condition counterpart to `buildExpression` and the exact string
 * `parseExpression` is the inverse of.
 */
export function buildGroup (combinator: Combinator, conditions: ExpressionSpec[]): string {
	return (conditions ?? [])
		.map(buildExpression)
		.filter(Boolean)
		.join(combinator === 'or' ? ' || ' : ' && ')
}

/**
 * Un-escape the inner contents of a CEL double-quoted string literal. Exact
 * inverse of `celString` (reverses `\\ \" \n \r \t`). `inner` is the contents
 * between the surrounding quotes.
 */
function unescapeCelString (inner: string): string {
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
 */
function matchStringLiteral (s: string): { value: string, end: number } | null {
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
 */
function splitTopLevel (s: string): { parts: string[], op: Combinator | null } | null {
	const parts: string[] = []
	let op: Combinator | null = null
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
const fieldByAccessor: Record<string, string> = Object.fromEntries(
	fields.filter((f) => f.accessor).map((f) => [f.accessor, f.value])
)

/** Map a named-map field's `request.xxx[` prefix back to its field key. */
const nameFieldByPrefix: Record<string, string> = Object.fromEntries(
	fields
		.filter((f) => f.hasName && f.accessorMap)
		.map((f) => [(f.accessorMap ?? '').split('["<name>"]')[0], f.value])
)

/**
 * Parse a single accessor at the START of `s` (a fixed `request.x` accessor or a
 * named `request.headers["name"]` form). Returns the resolved field key, the
 * optional decoded name, and the index just past the accessor — or `null`.
 */
function matchAccessor (s: string): { field: string, name?: string, end: number } | null {
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
	let best: string | null = null
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
 */
function matchList (s: string): { items: string[], end: number } | null {
	if (s[0] !== '[') return null
	let i = 1
	const items: string[] = []
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
 */
function matchIntList (s: string): { items: string[], end: number } | null {
	if (s[0] !== '[') return null
	let i = 1
	const items: string[] = []
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
 */
function parseMethodCall (s: string): ExpressionSpec | null {
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
	let method: 'startsWith' | 'endsWith' | null = null
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
 * Parse the `ipInList(<accessor>, "<name>")` platform-macro form — optionally
 * negated with a leading `!` — back into an `in_ip_list` / `not_in_ip_list`
 * spec. Strict, mirroring the generator: ip-type accessor only, plain
 * double-quoted valid list name, no extra whitespace. Returns the spec or
 * `null`.
 *
 * Deliberately stricter than the chip scanner (`parseWafListMacro` below),
 * which tolerates arbitrary whitespace and any operand: a valid raw-authored
 * usage like `ipInList(request.remote_ip,"x")` still shows a list chip on the
 * manage page but keeps the edit page in Raw mode — the same round-trip
 * fidelity bar as `in_cidr`.
 */
function matchIpInList (part: string): ExpressionSpec | null {
	let negate = false
	let body = part
	if (body.startsWith('!')) {
		negate = true
		body = body.slice(1)
	}
	const head = 'ipInList('
	if (!body.startsWith(head)) return null
	const acc = matchAccessor(body.slice(head.length))
	if (!acc) return null
	const field = getField(acc.field)
	if (!field || field.type !== 'ip') return null
	let i = head.length + acc.end
	if (body.slice(i, i + 2) !== ', ') return null
	i += 2
	// Name literal: plain double-quoted, no escapes (the macro grammar; a valid
	// list name can't contain a quote or backslash anyway).
	if (body[i] !== '"') return null
	const close = body.indexOf('"', i + 1)
	if (close < 0) return null
	const name = body.slice(i + 1, close)
	if (!validListName(name)) return null
	if (body.slice(close + 1) !== ')') return null
	return { field: acc.field, operator: negate ? 'not_in_ip_list' : 'in_ip_list', value: name }
}

/**
 * Parse exactly one CEL condition (a single conjunct) back into an
 * `ExpressionSpec`. Strict: only forms `buildExpression` can emit are accepted.
 * Returns `null` for anything else.
 */
function parseCondition (part: string): ExpressionSpec | null {
	const s = part.trim()
	if (!s) return null

	// Method-call forms: `<accessor>.startsWith("v")` / `.endsWith("v")`, each
	// optionally negated with a leading `!`.
	const method = parseMethodCall(s)
	if (method) return method

	// Platform-macro form: `ipInList(<accessor>, "<name>")`, optionally negated.
	const ipList = matchIpInList(s)
	if (ipList) return ipList

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
 */
export function parseExpression (cel: string): ExpressionGroup | null {
	const trimmed = String(cel ?? '').trim()
	if (trimmed === '') return { combinator: 'and', conditions: [] }

	const split = splitTopLevel(trimmed)
	if (!split) return null

	const conditions: ExpressionSpec[] = []
	for (const part of split.parts) {
		const spec = parseCondition(part)
		if (!spec) return null
		conditions.push(spec)
	}

	return { combinator: split.op ?? 'and', conditions }
}

// ---------------------------------------------------------------------------
// ipInList macro scanner — TS mirror of the api package's waflistmacro.go.
// Used to decorate rules/limits that reference a named IP list; the server
// remains authoritative for validation. Keep the two implementations in sync —
// the one behavior that must match exactly is never treating an `ipInList`
// token INSIDE a string literal as a reference (string-skipping rules);
// divergence on malformed input (e.g. a raw newline in a single-quoted
// literal, which cel-go rejects outright) is cosmetic, chips only.

function isMacroIdentStart (c: string): boolean {
	return c === '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isMacroIdentChar (c: string): boolean {
	return isMacroIdentStart(c) || (c >= '0' && c <= '9')
}

/** CEL string-literal prefix: r/R (raw), b/B (bytes), or one of each in either order. */
function isCelStringPrefix (ident: string): boolean {
	if (ident.length === 1) return /[rRbB]/.test(ident)
	if (ident.length === 2) {
		return (/[rR]/.test(ident[0]) && /[bB]/.test(ident[1])) ||
			(/[bB]/.test(ident[0]) && /[rR]/.test(ident[1]))
	}
	return false
}

/**
 * Index just past the CEL string literal starting at `expr[i]` (a quote).
 * Handles single- and triple-quoted forms; escapes honored unless `raw`. An
 * unterminated literal consumes to end of input — the scanner is structural,
 * it only must never find the token inside literal text.
 */
function skipCelStringLiteral (expr: string, i: number, raw: boolean): number {
	const n = expr.length
	const q = expr[i]
	if (i + 2 < n && expr[i + 1] === q && expr[i + 2] === q) {
		// triple-quoted
		i += 3
		while (i < n) {
			if (!raw && expr[i] === '\\') {
				i += 2
				continue
			}
			if (expr[i] === q && i + 2 < n && expr[i + 1] === q && expr[i + 2] === q) return i + 3
			i++
		}
		return n
	}
	i++
	while (i < n) {
		if (!raw && expr[i] === '\\') {
			i += 2
		} else if (expr[i] === q) {
			return i + 1
		} else if (expr[i] === '\n') {
			// single-line literal cannot span a newline; resume scanning after it
			return i + 1
		} else {
			i++
		}
	}
	return n
}

/**
 * Parse one macro immediately after its identifier token (`i` points just past
 * "ipInList"). Grammar (whitespace allowed between the punctuation):
 *
 *	ipInList( <ident>(.<ident> | ["<key>"])* , "<list-name>" )
 *
 * Returns the list name and the index just past the closing paren, or `null`
 * when the usage doesn't match (the server rejects such expressions; here a
 * malformed usage simply carries no resolvable ref).
 */
function parseWafListMacro (expr: string, i: number): { name: string, end: number } | null {
	const n = expr.length
	const skipWS = (j: number): number => {
		while (j < n && (expr[j] === ' ' || expr[j] === '\t' || expr[j] === '\n' || expr[j] === '\r')) j++
		return j
	}

	i = skipWS(i)
	if (expr[i] !== '(') return null
	i = skipWS(i + 1)

	// operand := ident (("." ident) | ("[" dq-string "]"))* — no inner whitespace
	if (i >= n || !isMacroIdentStart(expr[i])) return null
	while (i < n && isMacroIdentChar(expr[i])) i++
	let selectors = true
	while (selectors && i < n) {
		if (expr[i] === '.') {
			i++
			if (i >= n || !isMacroIdentStart(expr[i])) return null
			while (i < n && isMacroIdentChar(expr[i])) i++
		} else if (expr[i] === '[') {
			i++
			if (expr[i] !== '"') return null
			i++
			while (i < n && expr[i] !== '"') {
				if (expr[i] === '\\' || expr[i] === '\n' || expr[i] === '\r') return null
				i++
			}
			if (i >= n) return null
			i++ // closing quote
			if (expr[i] !== ']') return null
			i++
		} else {
			selectors = false
		}
	}

	i = skipWS(i)
	if (expr[i] !== ',') return null
	i = skipWS(i + 1)

	// name := plain double-quoted valid list name, no escapes
	if (expr[i] !== '"') return null
	i++
	const nameStart = i
	while (i < n && expr[i] !== '"') {
		if (expr[i] === '\\' || expr[i] === '\n' || expr[i] === '\r') return null
		i++
	}
	if (i >= n) return null
	const name = expr.slice(nameStart, i)
	i++ // closing quote
	if (!validListName(name)) return null

	i = skipWS(i)
	if (expr[i] !== ')') return null
	return { name, end: i + 1 }
}

/**
 * The sorted, de-duplicated list names referenced by well-formed ipInList
 * macros in a rule expression or limit filter. Skips string literals (all CEL
 * forms: `"…"`, `'…'`, triple-quoted, with r/R raw and b/B bytes prefixes,
 * honoring escapes in non-raw forms) and `//` comments, so a token inside
 * literal text is never a reference.
 */
export function wafListRefs (expr: string): string[] {
	const names = new Set<string>()
	const s = String(expr ?? '')
	const n = s.length
	let i = 0
	while (i < n) {
		const c = s[i]
		if (c === '/' && s[i + 1] === '/') {
			const j = s.indexOf('\n', i)
			if (j < 0) break
			i = j + 1
		} else if (c === '"' || c === '\'') {
			i = skipCelStringLiteral(s, i, false)
		} else if (isMacroIdentStart(c)) {
			const start = i
			while (i < n && isMacroIdentChar(s[i])) i++
			const ident = s.slice(start, i)
			if (i < n && (s[i] === '"' || s[i] === '\'') && isCelStringPrefix(ident)) {
				i = skipCelStringLiteral(s, i, /[rR]/.test(ident))
				continue
			}
			if (ident === 'ipInList') {
				const m = parseWafListMacro(s, i)
				if (m) {
					names.add(m.name)
					i = m.end
				}
			}
		} else {
			i++
		}
	}
	return [...names].sort()
}
