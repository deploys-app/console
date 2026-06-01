import { env } from '$env/dynamic/private'

const authEndpoint = env.AUTH_ENDPOINT || 'https://auth.deploys.app'

const webcrypto = crypto

/**
 * randomState generates a random string for OAuth2 state
 * @returns {string}
 */
function randomState () {
	const x = new Uint8Array(16)
	webcrypto.getRandomValues(x)
	return Array.from(x, (d) => d.toString(16).padStart(2, '0')).join('')
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url }) {
	const state = randomState()

	const callback = new URL(url.toString())
	callback.pathname = '/auth/callback'

	const q = new URLSearchParams()
	q.set('response_type', 'code')
	q.set('client_id', env.OAUTH2_CLIENT_ID)
	q.set('redirect_uri', callback.toString())
	q.set('state', state)

	// TEMPORARY diagnostic — remove once the Safari "invalid state" issue is
	// understood. `secure` must be true for SameSite=None to be stored at all.
	console.warn('[auth-debug] signin ' + JSON.stringify({
		state,
		secure: import.meta.env.PROD
	}))

	cookies.set('state', state, {
		httpOnly: true,
		maxAge: 60 * 60,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	// Stable WebKit (Safari) does NOT persist a Set-Cookie carried on a response
	// that immediately redirects cross-origin, so 302'ing straight to
	// auth.deploys.app dropped the `state` cookie and the callback then saw no
	// cookie ("invalid state"). Commit the cookie on a normal same-origin 200,
	// then redirect to the auth host from the client.
	const authUrl = `${authEndpoint}/?${q.toString()}`
	const safeAuthUrl = JSON.stringify(authUrl).replace(/</g, '\\u003c')
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title><script>location.replace(${safeAuthUrl})</script><noscript><meta http-equiv="refresh" content="0;url=${authUrl.replace(/"/g, '%22')}"></noscript></head><body></body></html>`

	return new Response(html, {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store'
		}
	})
}
