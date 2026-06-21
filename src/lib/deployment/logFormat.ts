// Shared rendering helpers for the deployment log views (live tail + durable
// history), so both colour pods, classify severity, and format relative times
// identically.

export type Severity = 'error' | 'warn' | 'debug' | 'plain'

export function detectSeverity (log: string): Severity {
	const t = log.toLowerCase()
	if (/\b(error|fatal|panic|exception|critical|fail(ed|ure)?)\b/.test(t)) return 'error'
	if (/\b(warn(ing)?|deprecated)\b/.test(t)) return 'warn'
	if (/\b(debug|trace)\b/.test(t)) return 'debug'
	return 'plain'
}

// Eight evenly-spaced hues used to colour pod chips. Hashing the pod name into
// this palette gives every pod a stable, distinguishable colour so multi-replica
// streams stay visually separable.
const POD_HUES = [355, 28, 48, 142, 175, 205, 260, 312]

export function podHue (s: string): number {
	let h = 0
	for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
	return POD_HUES[Math.abs(h) % POD_HUES.length]
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
