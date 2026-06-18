// Helpers for interpreting the raw k8s failure reasons the log service's
// /errors endpoint returns. The endpoint emits reasons verbatim (no
// classification enum) so newly-added k8s reasons keep flowing through
// untouched — the console turns them into something human here.

/**
 * A short label for a pod's current failure, e.g. `CrashLoopBackOff` /
 * `ImagePullBackOff`. Prefers the live waiting/terminated reason, then the
 * previous termination, and finally falls back to the phase.
 */
export function podErrorReason (p: Api.PodError): string {
	if (p.waitingReason) return p.waitingReason
	if (p.terminatedReason) return p.terminatedReason
	if (p.lastTerminatedReason) return p.lastTerminatedReason
	if (p.phase === 'Pending') return 'Pending'
	if (p.phase === 'Running') return 'Not ready'
	return p.phase || 'Unknown'
}

/**
 * A one-line detail for a pod: restart count and exit code where meaningful.
 * Exit 0 is treated as "no signal" (the reason already carries the meaning).
 */
export function podErrorDetail (p: Api.PodError): string {
	const parts: string[] = []
	if (p.restartCount > 0) parts.push(`${p.restartCount} restart${p.restartCount === 1 ? '' : 's'}`)
	const exit = p.terminatedExitCode || p.lastTerminatedExitCode
	if (exit) parts.push(`exit ${exit}`)
	return parts.join(' · ')
}

/** The most common failure reason across a set of error pods (for a summary). */
export function dominantReason (pods: Api.PodError[]): string {
	const counts = new Map<string, number>()
	for (const p of pods) {
		const r = podErrorReason(p)
		counts.set(r, (counts.get(r) ?? 0) + 1)
	}
	let best = ''
	let bestN = 0
	for (const [r, n] of counts) {
		if (n > bestN) {
			best = r
			bestN = n
		}
	}
	return best
}
