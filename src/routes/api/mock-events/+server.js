// Mock pod-event feed for offline development. Only active when MOCK_API is
// set — outside that the route 404s. Returns the same JSON shape the real
// events service emits: an array of { type, reason, message, lastSeen }.
//
// The events page polls this on a 5 s interval; we want the output to feel
// "real" — a Normal-heavy mix with the occasional Warning, and timestamps
// that drift forward as the page sits open so the relative-time column
// keeps updating naturally.

import { env } from '$env/dynamic/private'

const NORMAL = [
	{ reason: 'Scheduled', message: 'Successfully assigned acme/web-7d4f-x1 to gke-node-rcf2-pool-1-3a8f' },
	{ reason: 'Pulling', message: 'Pulling image "registry.deploys.app/acme/web:latest"' },
	{ reason: 'Pulled', message: 'Successfully pulled image "registry.deploys.app/acme/web:latest" in 2.317s' },
	{ reason: 'Created', message: 'Created container web' },
	{ reason: 'Started', message: 'Started container web' },
	{ reason: 'SuccessfulCreate', message: 'Created pod: web-7d4f-x2' },
	{ reason: 'SuccessfulDelete', message: 'Deleted pod: web-6c1e-old' },
	{ reason: 'Killing', message: 'Stopping container web' }
]

const WARNINGS = [
	{ reason: 'BackOff', message: 'Back-off restarting failed container web in pod web-7d4f-x1' },
	{ reason: 'Unhealthy', message: 'Readiness probe failed: HTTP probe failed with statuscode: 503' },
	{ reason: 'FailedScheduling', message: '0/5 nodes are available: 5 Insufficient memory.' },
	{ reason: 'FailedMount', message: 'Unable to attach or mount volumes: unmounted volumes=[data]' }
]

/**
 * Build a varied, reasonably-realistic feed where timestamps are anchored to
 * "now" so the events page's relative-time column shows fresh values.
 * @param {number} count
 */
function buildFeed (count) {
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

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET () {
	if (!env.MOCK_API) return new Response('not found', { status: 404 })

	const events = buildFeed(12 + (Math.random() * 8 | 0))
	return new Response(JSON.stringify(events), {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store'
		}
	})
}
