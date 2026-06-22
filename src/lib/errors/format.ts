// Shared helpers for the two error-detection surfaces — the per-deployment
// Errors tab and the project-wide Errors page. Pure and dependency-free; the
// `Api` types are globally available (src/types/api.d.ts), so no import needed.

// The list endpoint reports this when a deployment's location has no log bucket
// (error detection permanently unavailable there); we match on the stable
// substring rather than an error code, mirroring the API contract.
export const UNAVAILABLE_MARKER = 'error detection is not available for this location'

export const STATUS_FILTERS: { value: Api.ErrorStatusFilter, label: string }[] = [
	{ value: 'open', label: 'Open' },
	{ value: 'resolved', label: 'Resolved' },
	{ value: 'muted', label: 'Muted' },
	{ value: 'all', label: 'All' }
]

// Server-side ordering (error.list `sort`). Default keeps the freshest issue on
// top; "Count" surfaces the loudest, which is what you usually want to triage.
export const SORT_OPTIONS: { value: Api.ErrorSort, label: string }[] = [
	{ value: 'lastSeen', label: 'Last seen' },
	{ value: 'count', label: 'Count' },
	{ value: 'firstSeen', label: 'First seen' }
]

// Short, language-coloured kind badges. Hues are token-based so they recolour
// with the theme.
const KIND_META: Record<Api.ErrorKind, { label: string, hue: number }> = {
	go: { label: 'Go', hue: 198 },
	java: { label: 'Java', hue: 18 },
	python: { label: 'Py', hue: 142 },
	node: { label: 'Node', hue: 96 },
	ruby: { label: 'Ruby', hue: 355 },
	generic: { label: 'Generic', hue: 250 }
}

export function kindMeta (kind: Api.ErrorKind): { label: string, hue: number } {
	return KIND_META[kind] ?? { label: kind, hue: 250 }
}

// Eight evenly-spaced hues; hashing a stable string (pod or deployment name)
// into the palette gives each one a stable, distinguishable colour.
const HUES = [355, 28, 48, 142, 175, 205, 260, 312]

export function hashHue (s: string): number {
	let h = 0
	for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
	return HUES[Math.abs(h) % HUES.length]
}

// ts is ISO 8601; nowMs is a shared "now" tick so all rows refresh together.
export function relTime (ts: string, nowMs: number): string {
	const t = Date.parse(ts)
	if (isNaN(t)) return ''
	const diff = Math.max(0, nowMs - t)
	if (diff < 1000) return 'now'
	if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
	return `${Math.floor(diff / 86_400_000)}d`
}

// Classify a failed error.list response into the terminal state to render.
// `unavailable` means the location has no log bucket (detection permanently off
// there); everything else is a forbidden or transient error.
export type ListErrorKind = 'forbidden' | 'unavailable' | 'error'

export function classifyListError (resp: Api.Response<unknown>): { kind: ListErrorKind, message: string } {
	if (resp.error?.forbidden) return { kind: 'forbidden', message: '' }
	const msg = resp.error?.message ?? ''
	if (msg.includes(UNAVAILABLE_MARKER)) return { kind: 'unavailable', message: '' }
	return { kind: 'error', message: msg || 'Failed to load application errors.' }
}
