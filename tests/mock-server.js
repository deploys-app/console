/**
 * In-memory mock for the deploys.app API.
 *
 * Started by `playwright.config.js` as a webServer on port `MOCK_PORT`
 * (default 9999). The SvelteKit preview/dev server is started with
 * `API_ENDPOINT=http://localhost:9999`, so every `/api/<fn>` proxy call
 * lands here.
 *
 * Per-test isolation (so the suite can run on PARALLEL workers):
 * every test gets its own state "bucket" keyed by a per-test id. The id is
 * minted in tests/helpers.js and travels two ways —
 *   - control endpoints (/__reset, /__set, /__log) carry it as `?key=<id>`;
 *   - data requests carry it as the `x-mock-key` header, which the
 *     /api/[fn] proxy forwards from the per-test `mock_key` cookie.
 * A bucket holds its own `responses` map + `requestLog`, so concurrent tests
 * never see or clobber each other's mocks. A data request with NO key fails
 * loudly (400) rather than silently sharing state — that turns any future
 * wiring gap into an obvious failure instead of a flaky heisenbug.
 *
 * Control endpoints:
 *   POST /__reset?key=<id>   — restore default responses for that bucket
 *   POST /__set?key=<id>     — body: { "<path>": <response>, ... }
 *   GET  /__log?key=<id>     — read that bucket's request log
 */

import http from 'node:http'
import { defaultMocks } from './fixtures/mocks.js'

const PORT = Number(process.env.MOCK_PORT || 9999)

/** @type {Map<string, { responses: Record<string, any>, requestLog: { path: string, method: string, body: string }[] }>} */
const buckets = new Map()

/** Get (lazily creating) the state bucket for a test key. */
function bucket (key) {
	let b = buckets.get(key)
	if (!b) {
		b = { responses: defaultMocks(), requestLog: [] }
		buckets.set(key, b)
	}
	return b
}

function readBody (req) {
	return new Promise((resolve, reject) => {
		const chunks = []
		req.on('data', (c) => chunks.push(c))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		req.on('error', reject)
	})
}

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url || '/', 'http://localhost')
		const path = url.pathname

		if (path === '/__reset' && req.method === 'POST') {
			const key = url.searchParams.get('key') || 'default'
			buckets.set(key, { responses: defaultMocks(), requestLog: [] })
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
			return
		}

		if (path === '/__set' && req.method === 'POST') {
			const key = url.searchParams.get('key') || 'default'
			const body = await readBody(req)
			const overrides = body ? JSON.parse(body) : {}
			const { responses } = bucket(key)
			for (const k of Object.keys(overrides)) {
				responses[k.startsWith('/') ? k : `/${k}`] = overrides[k]
			}
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
			return
		}

		if (path === '/__log' && req.method === 'GET') {
			const key = url.searchParams.get('key') || 'default'
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify(bucket(key).requestLog))
			return
		}

		// Stand-in for the OAuth provider's token endpoint. `AUTH_ENDPOINT` is set
		// to `${MOCK_URL}/__auth`, so the sign-in callback exchanges its code here.
		// Always hand back a refresh token so the callback can complete. Stateless
		// (touches no bucket), so the unauthenticated sign-in path needs no key.
		if (path === '/__auth/token' && req.method === 'POST') {
			await readBody(req)
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-token' }))
			return
		}

		// Data request: must carry a per-test key (the proxy forwards the
		// `mock_key` cookie as `x-mock-key`). A missing key means the cookie→header
		// wiring broke — fail loud instead of silently sharing a default bucket and
		// bleeding state across parallel tests.
		const key = /** @type {string | undefined} */ (req.headers['x-mock-key'])
		if (!key) {
			res.writeHead(400, { 'content-type': 'application/json' })
			res.end(JSON.stringify({
				ok: false,
				error: { message: `mock: missing x-mock-key header for ${path}` }
			}))
			return
		}

		const { responses, requestLog } = bucket(key)
		const body = await readBody(req)
		requestLog.push({ path, method: req.method, body })

		const response = responses[path]

		// Body-aware authorization probe: `me.authorized` is a logical AND over the
		// requested permissions. A response of { __authorizedDeny: [perms] } denies
		// (authorized:false) whenever the request asks for any listed permission,
		// and authorizes otherwise — letting a test gate role perms off while
		// keeping serviceAccount.create on. Evaluated server-side so it also
		// applies to the SSR load() fetches, which page.route can't intercept.
		if (response && Array.isArray(response.__authorizedDeny)) {
			let requested = []
			try {
				requested = JSON.parse(body || '{}').permissions ?? []
			} catch { /* malformed body → treat as no permissions requested */ }
			const denied = requested.some((p) => response.__authorizedDeny.includes(p))
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true, result: { authorized: !denied } }))
			return
		}

		if (response === undefined) {
			res.writeHead(404, { 'content-type': 'application/json' })
			res.end(JSON.stringify({
				ok: false,
				error: { message: `api: ${path.replace(/^\//, '')} not found` }
			}))
			return
		}

		const status = response.__status || 200
		const { __status, ...payload } = response
		// eslint-disable-next-line no-unused-vars
		const _omit = __status
		res.writeHead(status, { 'content-type': 'application/json' })
		res.end(JSON.stringify(payload))
	} catch (err) {
		res.writeHead(500, { 'content-type': 'application/json' })
		res.end(JSON.stringify({ ok: false, error: { message: String(err) } }))
	}
})

server.listen(PORT, () => {
	console.log(`[mock-server] listening on http://localhost:${PORT}`)
})
