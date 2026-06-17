// Mock pod-event feed for offline development. Only active when MOCK_API is
// set — outside that the route 404s. Returns the same JSON shape the real
// events service emits: an array of { type, reason, message, lastSeen }.
//
// The events page polls this on a 5 s interval; we want the output to feel
// "real" — a Normal-heavy mix with the occasional Warning, and timestamps
// that drift forward as the page sits open so the relative-time column
// keeps updating naturally.

import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

// Pod references use full id-named pod names (`d128-77-<rsHash>-<podHash>`) so
// the events page exercises pod-name prefix stripping in free-text messages.
const NORMAL = [
	{ reason: 'Scheduled', message: 'Successfully assigned acme/d128-77-7d8f9b6c5-x2k9p to gke-node-rcf2-pool-1-3a8f' },
	{ reason: 'Pulling', message: 'Pulling image "registry.deploys.app/acme/web:latest"' },
	{ reason: 'Pulled', message: 'Successfully pulled image "registry.deploys.app/acme/web:latest" in 2.317s' },
	{ reason: 'Created', message: 'Created container web' },
	{ reason: 'Started', message: 'Started container web' },
	{ reason: 'SuccessfulCreate', message: 'Created pod: d128-77-7d8f9b6c5-q8m2t' },
	{ reason: 'SuccessfulDelete', message: 'Deleted pod: d128-77-5b9c4d2a1-h3n7v' },
	{ reason: 'Killing', message: 'Stopping container web' }
]

const WARNINGS = [
	{ reason: 'BackOff', message: 'Back-off restarting failed container web in pod d128-77-7d8f9b6c5-x2k9p' },
	{ reason: 'Unhealthy', message: 'Readiness probe failed: HTTP probe failed with statuscode: 503' },
	{ reason: 'FailedScheduling', message: '0/5 nodes are available: 5 Insufficient memory.' },
	{ reason: 'FailedMount', message: 'Unable to attach or mount volumes: unmounted volumes=[data]' }
]

/**
 * Build a varied, reasonably-realistic feed where timestamps are anchored to
 * "now" so the events page's relative-time column shows fresh values.
 */
function buildFeed (count: number) {
	const now = Date.now()
	const out = []
	for (let i = 0; i < count; i++) {
		const isWarn = Math.random() < 0.18
		const src = isWarn ? WARNINGS : NORMAL
		const t = src[Math.random() * src.length | 0]
		out.push({
			type: isWarn ? 'Warning' : 'Normal',
			reason: t.reason,
			message: t.message,
			// distribute over the last ~30 minutes, newest first
			lastSeen: new Date(now - i * (30 + Math.random() * 90) * 1000).toISOString()
		})
	}
	return out
}

export const GET: RequestHandler = async () => {
	if (!env.MOCK_API) return new Response('not found', { status: 404 })

	const events = buildFeed(12 + (Math.random() * 8 | 0))
	return new Response(JSON.stringify(events), {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store'
		}
	})
}
