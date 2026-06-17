// Shared override helpers for the cache list + edit pages. Override ids are
// auto-generated and stable for the life of an override (they appear in
// parapet's logs/metrics as override_id), so they must survive reordering.
// Order = match order, with `priority` derived from index on every whole-zone
// write — first match wins, lower priority first.

export interface OverrideForm {
	id: string
	description: string
	action: 'cache' | 'bypass'
	filter: string
	ttl: string
	policy: 'conservative' | 'balanced' | 'aggressive'
	staleWhileRevalidate: string
	staleIfError: string
	status: number[]
	mode: 'enforce' | 'shadow'
}

export const DEFAULT_POLICY = 'balanced'
export const DEFAULT_TTL = '1h'

export const actionLabels: Record<string, string> = {
	cache: 'Cache',
	bypass: 'Bypass'
}

export const policyLabels: Record<string, string> = {
	conservative: 'Conservative',
	balanced: 'Balanced',
	aggressive: 'Aggressive'
}

export const modeLabels: Record<string, string> = {
	enforce: 'Enforce',
	shadow: 'Shadow'
}

// TTL presets covering the API's allowed 1s..720h range. Zones loaded with a
// ttl outside this list still render — the edit page appends the loaded value
// as an extra option.
export const ttlOptions: { value: string, label: string }[] = [
	{ value: '1m', label: '1 minute' },
	{ value: '5m', label: '5 minutes' },
	{ value: '1h', label: '1 hour' },
	{ value: '6h', label: '6 hours' },
	{ value: '24h', label: '24 hours' },
	{ value: '168h', label: '7 days' }
]

export function overrideForm (override?: Api.CacheOverride): OverrideForm {
	return {
		id: override?.id ?? '',
		description: override?.description ?? '',
		action: override?.action ?? 'cache',
		filter: override?.filter ?? '',
		ttl: override?.ttl ?? DEFAULT_TTL,
		policy: (override?.policy ?? DEFAULT_POLICY) as OverrideForm['policy'],
		staleWhileRevalidate: override?.staleWhileRevalidate ?? '',
		staleIfError: override?.staleIfError ?? '',
		status: override?.status ?? [],
		mode: override?.mode ?? 'enforce'
	}
}

/**
 * Generate a stable, unique override id that doesn't collide with `taken`.
 */
export function genId (taken: string[]): string {
	let id
	do {
		id = 'override-' + Math.random().toString(36).slice(2, 8)
	} while (taken.includes(id))
	return id
}

// Map API overrides to form rows: order by priority (lower matches first) so
// the visible order is the match order, and give every row a unique id.
export function normalizeOverrides (apiOverrides?: Api.CacheOverride[]): OverrideForm[] {
	const sorted = [...(apiOverrides ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
	const taken: string[] = []
	return sorted.map((o) => {
		const f = overrideForm(o)
		if (!f.id || taken.includes(f.id)) f.id = genId(taken)
		taken.push(f.id)
		return f
	})
}

// Map form rows back to the API override shape. Priority follows row order —
// the top override matches first. For action 'bypass' the API rejects
// ttl/policy/status/stale_*, so those are OMITTED; for action 'cache' they
// are included.
export function toApiOverrides (overrides: OverrideForm[]): Api.CacheOverride[] {
	return overrides.map((o, i) => {
		const base: Api.CacheOverride = {
			id: o.id,
			description: o.description,
			action: o.action,
			filter: (o.filter ?? '').trim(),
			mode: o.mode === 'shadow' ? 'shadow' : 'enforce',
			priority: i
		}
		if (o.action === 'bypass') {
			// Bypass skips the cache entirely — ttl/policy/status/stale_* are
			// meaningless and rejected by the API, so omit them.
			return base
		}
		const status: number[] = (o.status ?? [])
			.map((s) => Number(s))
			.filter((s) => Number.isInteger(s) && s > 0)
		return {
			...base,
			ttl: o.ttl,
			policy: o.policy || DEFAULT_POLICY,
			...(o.staleWhileRevalidate?.trim() ? { staleWhileRevalidate: o.staleWhileRevalidate.trim() } : {}),
			...(o.staleIfError?.trim() ? { staleIfError: o.staleIfError.trim() } : {}),
			...(status.length ? { status } : {})
		}
	})
}

/**
 * Human summary of an override for the manage table, e.g. "Cache 1h (balanced)"
 * or "Bypass".
 */
export function describeOverride (o: OverrideForm): string {
	if (o.action === 'bypass') return 'Bypass'
	const policy = policyLabels[o.policy] ?? o.policy
	return `Cache ${o.ttl} (${(policy ?? '').toLowerCase()})`
}
