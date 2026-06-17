// Shared rule helpers for the firewall list + edit pages. Rule ids are
// auto-generated and stable for the life of a rule (they appear in parapet's
// logs/metrics as rule_id), so they must survive reordering. Order = execution
// order, with `priority` derived from index on every whole-zone write.

import { makeGenId, withStableIds } from '$lib/form/ids'

export interface RuleForm {
	id: string
	description: string
	expression: string
	action: 'log' | 'allow' | 'block'
	status: number | null
	message: string
}

export const DEFAULT_STATUS = 403
export const DEFAULT_MESSAGE = 'Forbidden'

export const actionLabels: Record<string, string> = {
	log: 'Log',
	allow: 'Allow',
	block: 'Block'
}

export function ruleForm (rule?: Api.WafRule): RuleForm {
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
 */
export const genId = makeGenId('rule-')

// Map API rules to form rows: order by priority (lower runs first) so the
// visible order is the execution order, and give every row a unique id.
export function normalizeRules (apiRules?: Api.WafRule[]): RuleForm[] {
	const sorted = [...(apiRules ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
	return withStableIds(sorted, ruleForm, genId)
}

// Map form rows back to the API rule shape. Priority follows row order — the
// top rule runs first; status + message only apply when blocking.
export function toApiRules (rules: RuleForm[]): Api.WafRule[] {
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
