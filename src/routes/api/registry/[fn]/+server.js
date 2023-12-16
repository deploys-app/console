const endpoint = 'https://registry.deploys.app/api'

/** @type {import('./$types').RequestHandler} */
export async function POST ({ locals, params, request }) {
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
