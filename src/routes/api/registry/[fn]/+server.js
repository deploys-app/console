import { env } from '$env/dynamic/private'
import { mockInvoke } from '$lib/server/mock'

const endpoint = env.REGISTRY_ENDPOINT || 'https://registry.deploys.app/api'

/** @type {import('./$types').RequestHandler} */
export async function POST ({ locals, params, request }) {
	// dev mock: short-circuit to static fixtures, no token required
	if (env.MOCK_API) {
		const args = await request.json().catch(() => ({}))
		return Response.json(mockInvoke(`registry/${params.fn}`, args))
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
		// @ts-expect-error workaround for missing type
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
