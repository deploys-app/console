import { env } from '$env/dynamic/private'

/** @type {Crypto} */
let webcrypto

// workaround for dev
if (typeof crypto === 'undefined') {
	import('node:crypto')
		.then((imp) => {
			// @ts-expect-error workaround to use Crypto while dev
			webcrypto = imp.webcrypto
		})
		.catch(() => {
			// don't throw error on compile time
		})
} else {
	webcrypto = crypto
}

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
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: `https://auth.deploys.app/?${q.toString()}`
		}
	})
}
