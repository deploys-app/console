import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import { mockInvoke } from '$lib/server/mock'

const endpoint = env.API_ENDPOINT || 'https://api.deploys.app'

export const POST: RequestHandler = async ({ locals, params, request, cookies }) => {
	// dev mock: short-circuit to static fixtures, no token required
	if (env.MOCK_API) {
		const args = await request.json().catch(() => ({}))
		return Response.json(mockInvoke(params.fn ?? '', args))
	}

	const token = locals.token

	// fast-path to reject unauthorized requests
	if (!token) {
		return new Response(JSON.stringify({
			ok: false,
			error: {
				message: 'api: unauthorized'
			}
		}), {
			headers: {
				'content-type': 'application/json'
			}
		})
	}

	// Test-only seam: the e2e harness sets a per-test `mock_key` cookie so the mock
	// server (tests/mock-server.js) can isolate each test's responses + request-log
	// into its own bucket — which is what lets the suite run on parallel workers.
	// No-op in production: the cookie is never set there, so no header is sent and
	// the real API simply never sees `x-mock-key`.
	const mockKey = cookies.get('mock_key')

	const resp = await fetch(`${endpoint}/${params.fn}`, {
		method: 'POST',
		body: request.body,
		duplex: 'half',
		headers: {
			accept: 'application/json',
			'content-type': request.headers.get('content-type') ?? 'application/json',
			authorization: `bearer ${token}`,
			'x-deploys-channel': 'console',
			...(mockKey ? { 'x-mock-key': mockKey } : {})
		}
	})
	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type') ?? ''
		}
	})
}
