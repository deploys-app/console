// Shared rule helpers for the firewall list + edit pages. Rule ids are
// auto-generated and stable for the life of a rule (they appear in parapet's
// logs/metrics as rule_id), so they must survive reordering. Order = execution
// order, with `priority` derived from index on every whole-zone write.

/**
 * @typedef {Object} RuleForm
 * @property {string} id
 * @property {string} description
 * @property {string} expression
 * @property {'log' | 'allow' | 'block'} action
 * @property {number | null} status
 * @property {string} message
 */

export const DEFAULT_STATUS = 403
export const DEFAULT_MESSAGE = 'Forbidden'

/** @type {Record<string, string>} */
export const actionLabels = {
	log: 'Log',
	allow: 'Allow',
	block: 'Block'
}

/**
 * @param {Api.WafRule} [rule]
 * @returns {RuleForm}
 */
export function ruleForm (rule) {
	return {
		id: rule?.id ?? '',
		description: rule?.description ?? '',
		expression: rule?.expression ?? '',
		action: rule?.action ?? 'log',
		status: rule?.status ?? DEFAULT_STATUS,
		message: rule?.message ?? DEFAULT_MESSAGE
	}
}

/**
 * Generate a stable, unique rule id that doesn't collide with `taken`.
 * @param {string[]} taken
 * @returns {string}
 */
export function genId (taken) {
	let id
	do {
		id = 'rule-' + Math.random().toString(36).slice(2, 8)
	} while (taken.includes(id))
	return id
}

// Map API rules to form rows: order by priority (lower runs first) so the
// visible order is the execution order, and give every row a unique id.
/**
 * @param {Api.WafRule[]} [apiRules]
 * @returns {RuleForm[]}
 */
export function normalizeRules (apiRules) {
	const sorted = [...(apiRules ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
	/** @type {string[]} */
	const taken = []
	return sorted.map((r) => {
		const f = ruleForm(r)
		if (!f.id || taken.includes(f.id)) f.id = genId(taken)
		taken.push(f.id)
		return f
	})
}

// Map form rows back to the API rule shape. Priority follows row order — the
// top rule runs first; status + message only apply when blocking.
/**
 * @param {RuleForm[]} rules
 * @returns {Api.WafRule[]}
 */
export function toApiRules (rules) {
	return rules.map((r, i) => ({
		id: r.id,
		description: r.description,
		expression: r.expression,
		action: r.action,
		priority: i,
		...(r.action === 'block'
			? {
				status: Number(r.status) || DEFAULT_STATUS,
				message: r.message || DEFAULT_MESSAGE
			}
			: {})
	}))
}
