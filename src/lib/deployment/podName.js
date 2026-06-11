// Pod names are `<kubeName>-<projectID>-<replicaSetHash>-<podHash>`. The
// `<kubeName>-<projectID>` part is the deployment's k8s service name — exactly
// what the API returns as `internalAddress` — and is identical on every pod, so
// repeating it (in the logs pod chip, or inside event messages) is pure noise
// that buries the part identifying the individual pod. For id-named deployments
// it's also the opaque `0d<id>` resource name the user never chose. These
// helpers strip that prefix wherever it appears, leaving just the pod-specific
// suffix (`<replicaSetHash>-<podHash>`).

/** @param {string} s */
function escapeRegExp (s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a function that strips the deployment's `<kubeName>-<projectID>-` prefix
 * from any text — a bare pod name (logs) or pod references embedded in free-text
 * event messages.
 *
 * @param {{ internalAddress?: string }} [deployment]
 * @returns {(text?: string) => string}
 */
export function podPrefixStripper (deployment) {
	const addr = (deployment?.internalAddress ?? '').trim()
	const alts = []
	// Primary: the exact service name (`<kubeName>-<projectID>`). Guard against
	// the field ever being an IP or empty by requiring the `<name>-<digits>`
	// shape so we never build a prefix that matches arbitrary text.
	if (/^[a-z0-9-]+-\d+$/i.test(addr)) alts.push(escapeRegExp(addr))
	// Fallback: any id-based prefix (`0d<id>-<projectID>`), so the opaque
	// resource name is still hidden even when internalAddress is unavailable.
	alts.push('0d\\d+-\\d+')
	const re = new RegExp('(?:' + alts.join('|') + ')-', 'g')
	return (text) => (text ?? '').replace(re, '')
}
