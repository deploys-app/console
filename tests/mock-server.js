/**
 * In-memory mock for the deploys.app API.
 *
 * Started by `playwright.config.js` as a webServer on port `MOCK_PORT`
 * (default 9999). The SvelteKit preview/dev server is started with
 * `API_ENDPOINT=http://localhost:9999`, so every `/api/<fn>` proxy call
 * lands here.
 *
 * Tests configure responses per-test via two control endpoints:
 *   POST /__reset            — restore default responses
 *   POST /__set              — body: { "<path>": <response>, ... }
 *
 * Tests run with `workers: 1` so that the single shared mock state is safe.
 */

import http from 'node:http'
import { defaultMocks } from './fixtures/mocks.js'

const PORT = Number(process.env.MOCK_PORT || 9999)

let responses = defaultMocks()
const requestLog = []

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
			responses = defaultMocks()
			requestLog.length = 0
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
			return
		}

		if (path === '/__set' && req.method === 'POST') {
			const body = await readBody(req)
			const overrides = body ? JSON.parse(body) : {}
			for (const key of Object.keys(overrides)) {
				const k = key.startsWith('/') ? key : `/${key}`
				responses[k] = overrides[key]
			}
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
			return
		}

		if (path === '/__log' && req.method === 'GET') {
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify(requestLog))
			return
		}

		// Stand-in for the OAuth provider's token endpoint. `AUTH_ENDPOINT` is set
		// to `${MOCK_URL}/__auth`, so the sign-in callback exchanges its code here.
		// Always hand back a refresh token so the callback can complete.
		if (path === '/__auth/token' && req.method === 'POST') {
			await readBody(req)
			res.writeHead(200, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-token' }))
			return
		}

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
