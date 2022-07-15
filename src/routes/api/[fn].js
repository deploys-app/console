const endpoint = 'https://api.deploys.app'

export async function POST ({ locals, params, request }) {
	const token = locals.token

	const resp = await fetch(`${endpoint}/${params.fn}`, {
		method: 'POST',
		body: request.body,
		headers: {
			accept: 'application/json',
			'content-type': request.headers.get('content-type'),
			authorization: `bearer ${token}`
		}
	})
	return {
		status: resp.status,
		body: await resp.text()
	}
}
