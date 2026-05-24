/** @type {import('./$types').RequestHandler} */
export async function POST ({ locals, request, url }) {
	const token = locals.token
	const project = url.searchParams.get('project')
	const filename = url.searchParams.get('filename') ?? ''

	if (!token || !project) {
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

	/** @type {Record<string, string>} */
	const headers = {
		accept: 'application/json',
		'content-type': request.headers.get('content-type') ?? 'application/octet-stream',
		'param-project': project,
		authorization: `bearer ${token}`
	}
	if (filename) {
		headers['param-filename'] = filename
	}

	const resp = await fetch('https://dropbox.deploys.app/', {
		method: 'POST',
		body: request.body,
		// @ts-expect-error workaround for missing type
		duplex: 'half',
		headers
	})
	return new Response(resp.body, {
		status: resp.status,
		headers: {
			'content-type': resp.headers.get('content-type') ?? ''
		}
	})
}
