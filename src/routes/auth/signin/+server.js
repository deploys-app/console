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

	cookies.set('state', state, {
		httpOnly: true,
		maxAge: 60 * 60,
		sameSite: 'none',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: `${authEndpoint}/?${q.toString()}`,
			'cache-control': 'no-store'
		}
	})
}
