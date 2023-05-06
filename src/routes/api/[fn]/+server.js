const endpoint = 'https://api.deploys.app'

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST ({ locals, params, request }) {
	const token = locals.token

	const resp = await fetch(`${endpoint}/${params.fn}`, {
		method: 'POST',
		body: request.body,
		// @ts-ignore
		duplex: 'half',
		headers: {
			accept: 'application/json',
			'content-type': request.headers.get('content-type'),
			authorization: `bearer ${token}`
		}
	})
	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type')
		}
	})
}
