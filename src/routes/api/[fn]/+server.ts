import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import { mockInvoke } from '$lib/server/mock'

const endpoint = env.API_ENDPOINT || 'https://api.deploys.app'

export const POST: RequestHandler = async ({ locals, params, request }) => {
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

	const resp = await fetch(`${endpoint}/${params.fn}`, {
		method: 'POST',
		body: request.body,
		duplex: 'half',
		headers: {
			accept: 'application/json',
			'content-type': request.headers.get('content-type') ?? 'application/json',
			authorization: `bearer ${token}`
		}
	})
	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type') ?? ''
		}
	})
}
