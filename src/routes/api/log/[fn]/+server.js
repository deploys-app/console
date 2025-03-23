/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST ({ params }) {
	if (!params.fn) {
		throw new Error('Missing URL parameter: fn')
	}

	const resp = await fetch(params.fn, {
		method: 'GET',
		headers: {
			'content-type': 'application/json'
		}
	})

	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type') ?? ''
		}
	})
}
