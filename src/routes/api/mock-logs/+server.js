// Mock pod log stream for offline development. Only active when MOCK_API is
// set — in any other build, this route 404s, so it is effectively dev-only.
//
// Two response shapes, matching what the real log service exposes:
//   - default (or ?type=sse)     → text/event-stream, JSON-per-event
//   - ?type=text or ?raw=1       → text/plain, one line per entry
//
// Emits a bursty mix of access lines, cache events, warnings and the
// occasional error / panic from three "pods", so the redesigned logs page
// (severity colouring, pod chips, throughput meter, buffer fill, …) can be
// exercised against something realistic via `bun dev:mock`.

import { env } from '$env/dynamic/private'

// Full pod names (`<kubeName>-<projectID>-<rsHash>-<podHash>`) for an id-named
// deployment, so the logs page exercises pod-name prefix stripping — only the
// `<rsHash>-<podHash>` suffix should show in the chip.
const PODS = [
	'd128-77-7d8f9b6c5-x2k9p',
	'd128-77-7d8f9b6c5-q8m2t',
	'd128-77-5b9c4d2a1-h3n7v'
]

const TEMPLATES = [
	() => `GET /api/users?page=${(Math.random() * 5 | 0) + 1} 200 ${(Math.random() * 200 | 0) + 20}ms`,
	() => `GET /api/posts/${Math.random().toString(36).slice(2, 10)} 200 ${(Math.random() * 100 | 0) + 5}ms`,
	() => `POST /api/jobs 201 ${(Math.random() * 300 | 0) + 50}ms`,
	() => 'GET /healthz 200 1ms',
	() => `cache hit user:${Math.random() * 9999 | 0} ttl=300s`,
	() => `cache miss user:${Math.random() * 9999 | 0} → source=postgres took=${(Math.random() * 40 | 0) + 4}ms`,
	() => `worker: job:email-${Math.random().toString(36).slice(2, 8)} completed in ${Math.random() * 1500 | 0}ms`,
	() => `WARN slow query (${(0.8 + Math.random()).toFixed(2)}s): SELECT * FROM posts WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 50`,
	() => 'WARN deprecated config option "useLegacyRouter" — switch to router=v2',
	() => `DEBUG poll tick interval=4000ms backlog=${Math.random() * 6 | 0}`,
	() => `DEBUG trace id=${Math.random().toString(36).slice(2, 14)} duration=12ms`,
	() => 'ERROR connection refused: redis://upstream:6379',
	() => 'ERROR upstream returned 502 Bad Gateway after 3 retries',
	() => 'panic: runtime error: invalid memory address or nil pointer dereference'
]

// Rough weights so that the stream feels like real traffic: lots of access
// lines, some debug / cache chatter, occasional warns, rare errors.
const WEIGHTS = [10, 10, 8, 12, 8, 4, 5, 2, 1, 4, 4, 1, 1, 0.5]
const WEIGHT_TOTAL = WEIGHTS.reduce((a, b) => a + b, 0)

function pickTemplate () {
	let r = Math.random() * WEIGHT_TOTAL
	for (let i = 0; i < TEMPLATES.length; i++) {
		r -= WEIGHTS[i]
		if (r <= 0) return TEMPLATES[i]
	}
	return TEMPLATES[0]
}

function nextEntry () {
	return {
		pod: PODS[Math.random() * PODS.length | 0],
		timestamp: new Date().toISOString(),
		log: pickTemplate()()
	}
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ url }) {
	if (!env.MOCK_API) return new Response('not found', { status: 404 })

	const wantsText = url.searchParams.get('type') === 'text' || url.searchParams.get('raw') === '1'

	const enc = new TextEncoder()
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer
	let closed = false

	const stream = new ReadableStream({
		start (controller) {
			const tick = () => {
				if (closed) return
				// Most of the time emit a single line; occasionally a burst,
				// so the throughput meter and buffer-fill gauge in the rail
				// have something to wiggle.
				const burst = Math.random() < 0.15 ? 3 + (Math.random() * 5 | 0) : 1
				try {
					for (let i = 0; i < burst; i++) {
						const e = nextEntry()
						const chunk = wantsText
							? `${e.timestamp} ${e.pod} ${e.log}\n`
							: `data: ${JSON.stringify(e)}\n\n`
						controller.enqueue(enc.encode(chunk))
					}
				} catch {
					// controller closed underneath us — stop quietly.
					return
				}
				if (closed) return
				timer = setTimeout(tick, 80 + Math.random() * 370)
			}
			timer = setTimeout(tick, 50)
		},
		cancel () {
			closed = true
			if (timer) clearTimeout(timer)
		}
	})

	return new Response(stream, {
		headers: wantsText
			? {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'no-cache'
			}
			: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				connection: 'keep-alive'
			}
	})
}
