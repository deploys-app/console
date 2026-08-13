// Shared managed-rules (OWASP CRS) helpers for the firewall manage page —
// form ⇄ api normalization, mirroring limits.ts. The block is typed knobs
// only: the platform generates the SecLang document server-side, so the form
// never handles raw rules, just ints and CRS rule ids.

export interface ManagedForm {
	enabled: boolean
	mode: 'enforce' | 'detect'
	paranoiaLevel: number
	anomalyThreshold: number
	// Chip strings as typed; parsed/validated via excludedRuleError below.
	excludedRules: string[]
}

export const DEFAULT_PARANOIA_LEVEL = 1
export const DEFAULT_ANOMALY_THRESHOLD = 5

// Exclusion bounds mirror the api contract: only CRS detection-rule ids —
// below the floor sit the platform SecActions + CRS setup, at/above the
// ceiling the anomaly scoring machinery.
export const EXCLUDED_RULE_ID_MIN = 911100
export const EXCLUDED_RULE_ID_MAX = 948999
export const MAX_EXCLUDED_RULES = 50

export const paranoiaLevels: { value: number, label: string, description: string }[] = [
	{ value: 1, label: '1', description: 'Baseline, minimal false positives' },
	{ value: 2, label: '2', description: 'Elevated — some false positives' },
	{ value: 3, label: '3', description: 'Strict — expect to tune exclusions' },
	{ value: 4, label: '4', description: 'Paranoid, expect false positives' }
]

export const modeOptions: { value: 'enforce' | 'detect', label: string }[] = [
	{ value: 'enforce', label: 'Enforce (block)' },
	{ value: 'detect', label: 'Detect only (log, never block)' }
]

/**
 * Map an API managed-rules block (or its absence) to form state, rendering
 * the server-side defaults (0 = PL1 / threshold 5) explicitly.
 */
export function managedForm (m?: Api.WafManagedRules | null): ManagedForm {
	return {
		enabled: m?.enabled ?? false,
		mode: m?.mode === 'detect' ? 'detect' : 'enforce',
		paranoiaLevel: m?.paranoiaLevel || DEFAULT_PARANOIA_LEVEL,
		anomalyThreshold: m?.anomalyThreshold || DEFAULT_ANOMALY_THRESHOLD,
		excludedRules: (m?.excludedRules ?? []).map((id) => String(id))
	}
}

/**
 * Validation message for one excluded-rule chip, or '' when valid.
 */
export function excludedRuleError (raw: string): string {
	const trimmed = raw.trim()
	if (!/^\d+$/.test(trimmed)) return `${raw} is not a CRS rule id`
	const id = Number(trimmed)
	if (id < EXCLUDED_RULE_ID_MIN || id > EXCLUDED_RULE_ID_MAX) {
		return `${raw} is out of range (${EXCLUDED_RULE_ID_MIN}–${EXCLUDED_RULE_ID_MAX})`
	}
	return ''
}

/**
 * First validation problem across the whole form, or '' when saveable.
 */
export function managedFormError (f: ManagedForm): string {
	if (f.excludedRules.length > MAX_EXCLUDED_RULES) {
		return `At most ${MAX_EXCLUDED_RULES} excluded rules`
	}
	for (const raw of f.excludedRules) {
		const err = excludedRuleError(raw)
		if (err) return err
	}
	const threshold = Number(f.anomalyThreshold)
	if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
		return 'Anomaly threshold must be 1–100'
	}
	return ''
}

/**
 * Map form state back to the API block. Only call on a valid form
 * (managedFormError === ''). Exclusions are deduped and sorted so repeated
 * saves are byte-identical.
 */
export function toApiManaged (f: ManagedForm): Api.WafManagedRules {
	const ids = [...new Set(f.excludedRules.map((raw) => Number(raw.trim())))].sort((a, b) => a - b)
	return {
		enabled: f.enabled,
		mode: f.mode === 'detect' ? 'detect' : 'enforce',
		paranoiaLevel: Number(f.paranoiaLevel) || DEFAULT_PARANOIA_LEVEL,
		anomalyThreshold: Number(f.anomalyThreshold) || DEFAULT_ANOMALY_THRESHOLD,
		excludedRules: ids
	}
}
