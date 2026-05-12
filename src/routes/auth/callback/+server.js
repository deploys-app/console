import { env } from '$env/dynamic/private'

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url }) {
	const state = url.searchParams.get('state') ?? ''
	const code = url.searchParams.get('code') ?? ''

	if (state !== cookies.get('state')) {
		return new Response('invalid state', { status: 400 })
	}

	// exchange token
	const resp = await fetch('https://auth.deploys.app/token', {
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
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})
	cookies.delete('state', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: '/'
		}
	})
}
