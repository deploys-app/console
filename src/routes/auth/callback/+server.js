import { env } from '$env/dynamic/private'

const authEndpoint = env.AUTH_ENDPOINT || 'https://auth.deploys.app'

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url, request }) {
	const state = url.searchParams.get('state') ?? ''
	const code = url.searchParams.get('code') ?? ''

	// TEMPORARY diagnostic — remove once the Safari "invalid state" issue is
	// understood. Logs what the server actually receives vs the URL.
	const cookieState = cookies.get('state')
	console.warn('[auth-debug] callback ' + JSON.stringify({
		urlState: state,
		cookieState: cookieState ?? null,
		match: state === cookieState,
		rawCookie: request.headers.get('cookie')
	}))

	if (state !== cookies.get('state')) {
		return new Response('invalid state', { status: 400 })
	}

	// exchange token
	const resp = await fetch(`${authEndpoint}/token`, {
		method: 'POST',
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			client_id: env.OAUTH2_CLIENT_ID,
			client_secret: env.OAUTH2_CLIENT_SECRET
		}),
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		}
	})
	if (resp.status < 200 || resp.status > 299) {
		return resp
	}
	const respBody = await resp.json()
	const token = respBody.refresh_token
	if (!token) {
		return new Response('unknown error', { status: 500 })
	}

	cookies.set('token', token, {
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7,
		sameSite: 'none',
		path: '/',
		secure: import.meta.env.PROD
	})
	cookies.delete('state', {
		httpOnly: true,
		sameSite: 'none',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: '/',
			'cache-control': 'no-store'
		}
	})
}
