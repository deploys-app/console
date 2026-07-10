// WAF named IP lists (wafList.*) helpers. Pure, side-effect-free (no Svelte/
// SvelteKit imports) so the lists page stays thin and the helpers unit-test
// without a browser.
//
// Validation here is a best-effort client-side mirror of the api library's
// WAFListSet.Valid(): the server is authoritative (it also canonicalizes IPv6
// and detects post-normalization duplicates, which plain text comparison
// can't).

// Mirrors the api repo's ReValidName + MinNameLength..MaxNameLength — the same
// grammar the ipInList macro's name literal accepts, so a valid list is always
// referenceable.
export const WAF_LIST_NAME_MIN = 3
export const WAF_LIST_NAME_MAX = 26
export const reValidListName = /^[a-z][a-z0-9-]*[a-z0-9]$/

// Mirrors the api repo's WAF-list constraint constants.
export const WAF_LIST_MAX_ENTRIES = 1000
export const WAF_LIST_MAX_ENTRY_LENGTH = 64

export function validListName (name: string): boolean {
	return name.length >= WAF_LIST_NAME_MIN &&
		name.length <= WAF_LIST_NAME_MAX &&
		reValidListName.test(name)
}

/** IPv4 dotted quad, netip-strict: no leading zeros, each octet 0-255. */
function validIPv4 (s: string): boolean {
	const parts = s.split('.')
	if (parts.length !== 4) return false
	return parts.every((p) =>
		/^\d{1,3}$/.test(p) && Number(p) <= 255 && (p.length === 1 || p[0] !== '0'))
}

/**
 * Count the 16-bit groups in one side of an IPv6 text (either side of `::`).
 * Returns -1 when malformed. `v4Tail` allows an embedded IPv4 as the last
 * segment (counts as two groups).
 */
function ipv6Groups (part: string, v4Tail: boolean): number {
	if (part === '') return 0
	const segs = part.split(':')
	let count = 0
	for (let i = 0; i < segs.length; i++) {
		const seg = segs[i]
		if (v4Tail && i === segs.length - 1 && seg.includes('.')) {
			if (!validIPv4(seg)) return -1
			count += 2
			continue
		}
		if (!/^[0-9a-fA-F]{1,4}$/.test(seg)) return -1
		count += 1
	}
	return count
}

/** IPv6, zoned addresses rejected (a zone is host-local, meaningless at the edge). */
function validIPv6 (s: string): boolean {
	if (s.includes('%')) return false
	const i = s.indexOf('::')
	if (i >= 0) {
		if (s.includes('::', i + 1)) return false
		const head = ipv6Groups(s.slice(0, i), false)
		const tail = ipv6Groups(s.slice(i + 2), true)
		// `::` must compress at least one group.
		return head >= 0 && tail >= 0 && head + tail <= 7
	}
	return ipv6Groups(s, true) === 8
}

/** One v1 "ip" list entry: an IPv4/IPv6 address or CIDR. */
export function validIPListEntry (e: string): boolean {
	const slash = e.indexOf('/')
	if (slash >= 0) {
		const addr = e.slice(0, slash)
		const bits = e.slice(slash + 1)
		if (!/^\d{1,3}$/.test(bits) || (bits.length > 1 && bits[0] === '0')) return false
		const n = Number(bits)
		if (validIPv4(addr)) return n <= 32
		if (validIPv6(addr)) return n <= 128
		return false
	}
	return validIPv4(e) || validIPv6(e)
}

export interface ParsedIPListEntries {
	/** Trimmed, non-empty lines in input order (valid or not — what a save would send). */
	entries: string[]
	/** Human-readable problems, each naming the offending line. Empty ⇒ saveable. */
	errors: string[]
}

/**
 * Parse a lists-modal textarea (one IP or CIDR per line) into entries plus
 * per-line validation errors. Duplicate detection is best-effort (exact text,
 * case-insensitive) — the server canonicalizes IPv6 and catches the rest.
 */
export function parseIPListEntries (raw: string): ParsedIPListEntries {
	const entries: string[] = []
	const errors: string[] = []
	const seen = new Map<string, number>()
	const lines = String(raw ?? '').split('\n')
	for (let i = 0; i < lines.length; i++) {
		const e = lines[i].trim()
		if (!e) continue
		entries.push(e)
		const no = i + 1
		if (e.length > WAF_LIST_MAX_ENTRY_LENGTH) {
			errors.push(`line ${no}: entry must not exceed ${WAF_LIST_MAX_ENTRY_LENGTH} characters`)
			continue
		}
		if (!validIPListEntry(e)) {
			errors.push(`line ${no}: "${e}" is not an IP address or CIDR`)
			continue
		}
		const key = e.toLowerCase()
		const first = seen.get(key)
		if (first !== undefined) {
			errors.push(`line ${no}: duplicate of line ${first}`)
			continue
		}
		seen.set(key, no)
	}
	if (entries.length > WAF_LIST_MAX_ENTRIES) {
		errors.push(`lists are capped at ${WAF_LIST_MAX_ENTRIES} entries (got ${entries.length})`)
	}
	return { entries, errors }
}
