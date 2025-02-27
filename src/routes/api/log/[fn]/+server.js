/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST ({ params }) {
	const resp = await fetch(params.fn, {
		method: 'GET',
		duplex: 'half',
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
