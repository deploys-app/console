/**
 * Shared helpers for form-row identity. WAF rules/limits and cache overrides
 * all keep auto-generated, stable ids on their form rows so a row survives
 * reordering and re-saving; these collapse the id-generation + id-stabilizing
 * machinery that was duplicated across those modules.
 */

/**
 * Build an id generator that yields collision-free ids with the given prefix
 * (e.g. 'rule-', 'limit-', 'override-'), avoiding any id already in `taken`.
 */
export function makeGenId (prefix: string): (taken: string[]) => string {
	return (taken) => {
		let id
		do {
			id = prefix + Math.random().toString(36).slice(2, 8)
		} while (taken.includes(id))
		return id
	}
}

/**
 * Map API items to form rows, giving each a stable unique id: reuse the item's
 * own id when present and not already taken, otherwise mint a fresh one.
 */
export function withStableIds<A, F extends { id: string }> (
	items: A[] | undefined,
	toForm: (item: A) => F,
	genId: (taken: string[]) => string
): F[] {
	const taken: string[] = []
	return (items ?? []).map((item) => {
		const f = toForm(item)
		if (!f.id || taken.includes(f.id)) f.id = genId(taken)
		taken.push(f.id)
		return f
	})
}
