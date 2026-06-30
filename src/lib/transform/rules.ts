// Shared rule/op helpers for the transform list + edit pages. Like cache
// overrides, rule ids are auto-generated and stable for the life of a rule
// (they appear in parapet's future metric series as rule_id), so they must
// survive reordering. Order within a phase = match order, with `priority`
// derived from index on every whole-zone write.
//
// A transform rule is a phase + an optional CEL filter + an ordered list of
// ops of that phase. The op editor is net-new (cache only has filter+policy);
// each op is typed and reads only its own subset of fields.

import { makeGenId, withStableIds } from '$lib/form/ids'

// ---- Phase × op legality matrix (mirrors api §2.3) -------------------------

export const phaseLabels: Record<Api.TransformPhase, string> = {
	request: 'Request',
	response: 'Response'
}

// Op types legal in each phase. Header ops are phase-polymorphic (legal in
// both); the rest are phase-specific.
export const phaseOpTypes: Record<Api.TransformPhase, Api.TransformOpType[]> = {
	request: ['set-header', 'remove-header', 'rewrite-path', 'rewrite-query', 'redirect'],
	response: ['set-header', 'remove-header', 'set-status', 'cors']
}

export const opTypeLabels: Record<Api.TransformOpType, string> = {
	'set-header': 'Set header',
	'remove-header': 'Remove header',
	'rewrite-path': 'Rewrite path',
	'rewrite-query': 'Rewrite query',
	redirect: 'Redirect',
	'set-status': 'Set status',
	cors: 'CORS'
}

export const opTypeIcons: Record<Api.TransformOpType, string> = {
	'set-header': 'fa-plus',
	'remove-header': 'fa-minus',
	'rewrite-path': 'fa-route',
	'rewrite-query': 'fa-link',
	redirect: 'fa-arrow-right-arrow-left',
	'set-status': 'fa-hashtag',
	cors: 'fa-globe'
}

export const modeLabels: Record<string, string> = {
	enforce: 'Enforce',
	shadow: 'Shadow'
}

// redirect must be a 3xx; default 302.
export const redirectStatusOptions: { value: string, label: string }[] = [
	{ value: '301', label: '301 — Moved Permanently' },
	{ value: '302', label: '302 — Found' },
	{ value: '303', label: '303 — See Other' },
	{ value: '307', label: '307 — Temporary Redirect' },
	{ value: '308', label: '308 — Permanent Redirect' }
]

// Ops that take over the whole rule: a redirect short-circuits the chain and
// cors is mounted as a standalone middleware, so each must be the only op in
// its rule (api §3.4).
export const SOLE_OP_TYPES: Api.TransformOpType[] = ['redirect', 'cors']

export function isOpLegal (phase: Api.TransformPhase, type: Api.TransformOpType): boolean {
	return phaseOpTypes[phase].includes(type)
}

// ---- Form models -----------------------------------------------------------

// A single query param row for the rewrite-query editor (stable id for keying).
export interface QueryRow {
	id: string
	key: string
	value: string
}

// One op as edited in the form. Every typed field is present (zero-valued when
// unused) so a Select can switch an op's type without losing the other fields;
// toApiRules drops the fields irrelevant to the chosen type.
export interface OpForm {
	id: string
	type: Api.TransformOpType
	// header ops
	name: string
	value: string
	// redirect
	to: string
	// rewrite-path — `pathMode` chooses literal vs regex
	pathMode: 'path' | 'regex'
	path: string
	regex: string
	replace: string
	// rewrite-query
	query: QueryRow[]
	removeQuery: string[]
	// redirect / set-status (edited as text, parsed on save)
	status: string
	// cors
	allowOrigins: string[]
	allowMethods: string[]
	allowHeaders: string[]
	exposeHeaders: string[]
	allowCredentials: boolean
	maxAge: string
}

export interface RuleForm {
	id: string
	description: string
	phase: Api.TransformPhase
	filter: string
	ops: OpForm[]
	mode: 'enforce' | 'shadow'
}

export const genRuleId = makeGenId('transform-rule-')
export const genOpId = makeGenId('transform-op-')

// Default redirect status when the user hasn't picked one (matches the api
// default of 302).
export const DEFAULT_REDIRECT_STATUS = '302'

export function blankOp (phase: Api.TransformPhase, taken: string[] = []): OpForm {
	return {
		id: genOpId(taken),
		type: phaseOpTypes[phase][0],
		name: '',
		value: '',
		to: '',
		pathMode: 'path',
		path: '',
		regex: '',
		replace: '',
		query: [],
		removeQuery: [],
		status: '',
		allowOrigins: [],
		allowMethods: [],
		allowHeaders: [],
		exposeHeaders: [],
		allowCredentials: false,
		maxAge: ''
	}
}

function opForm (op: Api.TransformOp): OpForm {
	const base = blankOp('request')
	return {
		...base,
		type: op.type,
		name: op.name ?? '',
		value: op.value ?? '',
		to: op.to ?? '',
		pathMode: op.regex ? 'regex' : 'path',
		path: op.path ?? '',
		regex: op.regex ?? '',
		replace: op.replace ?? '',
		query: Object.entries(op.query ?? {}).map(([key, value]) => ({ id: genOpId([]), key, value })),
		removeQuery: [...(op.removeQuery ?? [])],
		status: op.status != null ? String(op.status) : '',
		allowOrigins: [...(op.allowOrigins ?? [])],
		allowMethods: [...(op.allowMethods ?? [])],
		allowHeaders: [...(op.allowHeaders ?? [])],
		exposeHeaders: [...(op.exposeHeaders ?? [])],
		allowCredentials: op.allowCredentials ?? false,
		maxAge: op.maxAge ?? ''
	}
}

function ruleForm (rule?: Api.TransformRule): RuleForm {
	const ops = (rule?.ops ?? []).map(opForm)
	// Give each op a stable, unique row id.
	const takenOpIds: string[] = []
	for (const op of ops) {
		if (takenOpIds.includes(op.id)) op.id = genOpId(takenOpIds)
		takenOpIds.push(op.id)
	}
	const phase: Api.TransformPhase = rule?.phase ?? 'request'
	return {
		id: rule?.id ?? '',
		description: rule?.description ?? '',
		phase,
		filter: rule?.filter ?? '',
		ops: ops.length ? ops : [blankOp(phase, takenOpIds)],
		mode: rule?.mode === 'shadow' ? 'shadow' : 'enforce'
	}
}

export function newRule (taken: string[]): RuleForm {
	return { ...ruleForm(), id: genRuleId(taken) }
}

// Map API rules to form rows: order by priority within the array order the
// server returned (priority is ascending within a phase), and give every row a
// unique stable id.
export function normalizeRules (apiRules?: Api.TransformRule[]): RuleForm[] {
	const sorted = [...(apiRules ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
	return withStableIds(sorted, ruleForm, genRuleId)
}

// When the rule's phase changes, coerce any op whose type is no longer legal in
// the new phase to the first legal type (header ops survive; phase-specific ops
// fold to set-header). Mutates in place.
export function coerceOpsToPhase (ops: OpForm[], phase: Api.TransformPhase): void {
	for (const op of ops) {
		if (!isOpLegal(phase, op.type)) op.type = phaseOpTypes[phase][0]
	}
}

// Map a single form op back to the API op shape, dropping every field that
// doesn't belong to the chosen type so the rendered yaml stays minimal.
function toApiOp (op: OpForm): Api.TransformOp {
	switch (op.type) {
	case 'set-header':
		return { type: op.type, name: op.name.trim(), value: op.value }
	case 'remove-header':
		return { type: op.type, name: op.name.trim() }
	case 'rewrite-path':
		if (op.pathMode === 'regex') {
			return { type: op.type, regex: op.regex, replace: op.replace }
		}
		return { type: op.type, path: op.path.trim() }
	case 'rewrite-query': {
		const out: Api.TransformOp = { type: op.type }
		const query: Record<string, string> = {}
		for (const row of op.query) {
			const k = row.key.trim()
			if (k) query[k] = row.value
		}
		if (Object.keys(query).length) out.query = query
		const removeQuery = op.removeQuery.map((q) => q.trim()).filter(Boolean)
		if (removeQuery.length) out.removeQuery = removeQuery
		return out
	}
	case 'redirect': {
		const out: Api.TransformOp = { type: op.type, to: op.to.trim() }
		const status = Number(op.status)
		if (Number.isInteger(status) && status > 0) out.status = status
		return out
	}
	case 'set-status': {
		const out: Api.TransformOp = { type: op.type }
		const status = Number(op.status)
		if (Number.isInteger(status) && status > 0) out.status = status
		return out
	}
	case 'cors': {
		const out: Api.TransformOp = { type: op.type, allowOrigins: [...op.allowOrigins] }
		if (op.allowMethods.length) out.allowMethods = [...op.allowMethods]
		if (op.allowHeaders.length) out.allowHeaders = [...op.allowHeaders]
		if (op.exposeHeaders.length) out.exposeHeaders = [...op.exposeHeaders]
		if (op.allowCredentials) out.allowCredentials = true
		if (op.maxAge.trim()) out.maxAge = op.maxAge.trim()
		return out
	}
	default:
		return { type: op.type }
	}
}

// Map form rows back to the API rule shape. Priority follows row order within
// the whole list (the api orders ascending within a phase, ties by id). Mode
// 'enforce' maps to the wire's '' (the api accepts only '' | 'shadow').
export function toApiRules (rules: RuleForm[]): Api.TransformRule[] {
	return rules.map((r, i) => ({
		id: r.id,
		description: r.description,
		phase: r.phase,
		filter: (r.filter ?? '').trim(),
		ops: r.ops.map(toApiOp),
		mode: r.mode === 'shadow' ? 'shadow' : '',
		priority: i
	}))
}

// One-line human summary of an op for the manage table.
export function describeOp (op: OpForm): string {
	switch (op.type) {
	case 'set-header':
		return `Set ${op.name || 'header'}`
	case 'remove-header':
		return `Remove ${op.name || 'header'}`
	case 'rewrite-path':
		return op.pathMode === 'regex' ? `Rewrite path ${op.regex || ''}`.trim() : `Rewrite path → ${op.path || '/'}`
	case 'rewrite-query':
		return 'Rewrite query'
	case 'redirect':
		return `Redirect ${op.status || DEFAULT_REDIRECT_STATUS}`
	case 'set-status':
		return `Set status ${op.status || ''}`.trim()
	case 'cors':
		return 'CORS'
	default:
		return op.type
	}
}

// Short summary of a rule's ops for the manage table behavior column.
export function describeRule (rule: RuleForm): string {
	if (rule.ops.length === 0) return 'No ops'
	if (rule.ops.length === 1) return describeOp(rule.ops[0])
	return `${rule.ops.length} ops`
}

// Light client-side validation mirroring the api's structural rules, enough to
// drive a disabled Save + an inline hint. The server enforces the full set
// (protected-header denylist, bounds, regex compile) and surfaces anything
// else on save.
export function validateRule (rule: RuleForm): string | null {
	if (rule.ops.length === 0) return 'Add at least one operation.'

	// redirect / cors must be the sole op in their rule.
	const sole = rule.ops.find((o) => SOLE_OP_TYPES.includes(o.type))
	if (sole && rule.ops.length > 1) {
		return `A ${opTypeLabels[sole.type]} operation must be the only operation in its rule.`
	}

	for (const op of rule.ops) {
		if (!isOpLegal(rule.phase, op.type)) {
			return `${opTypeLabels[op.type]} is not allowed in the ${phaseLabels[rule.phase].toLowerCase()} phase.`
		}
		switch (op.type) {
		case 'set-header':
			if (!op.name.trim()) return 'Set header needs a header name.'
			break
		case 'remove-header':
			if (!op.name.trim()) return 'Remove header needs a header name.'
			break
		case 'rewrite-path':
			if (op.pathMode === 'regex') {
				if (!op.regex.trim()) return 'Rewrite path needs a regex pattern.'
				if (!op.replace.trim()) return 'Rewrite path needs a replacement.'
			} else if (!op.path.trim()) {
				return 'Rewrite path needs a replacement path.'
			} else if (!op.path.trim().startsWith('/')) {
				return 'The replacement path must start with “/”.'
			}
			break
		case 'rewrite-query':
			if (op.query.every((q) => !q.key.trim()) && op.removeQuery.every((q) => !q.trim())) {
				return 'Rewrite query needs at least one parameter to set or remove.'
			}
			break
		case 'redirect':
			if (!op.to.trim()) return 'Redirect needs a target URL.'
			break
		case 'set-status': {
			const s = Number(op.status)
			if (!Number.isInteger(s) || s < 100 || s > 599) return 'Set status needs a status in 100–599.'
			break
		}
		case 'cors':
			if (op.allowOrigins.length === 0) return 'CORS needs at least one allowed origin.'
			if (op.allowCredentials && op.allowOrigins.includes('*')) {
				return 'CORS with credentials cannot allow the “*” origin.'
			}
			break
		}
	}
	return null
}
