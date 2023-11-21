/** @type {import('./$types').RequestHandler} */
export async function POST ({ request }) {
	const resp = await fetch('https://dropbox.deploys.app/', {
		method: 'POST',
		body: request.body,
		// @ts-ignore
		duplex: 'half',
		headers: {
			accept: 'application/json',
			'content-type': request.headers.get('content-type') ?? 'application/octet-stream'
		}
	})
	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type') ?? ''
		}
	})
}
