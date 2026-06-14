import { env } from '$env/dynamic/private'
import { sanitizeRedirect } from '$lib/server/redirect'

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
	// The OAuth redirect_uri must match exactly what the provider has registered —
	// strip our own `?redirect=` (and anything else) so it never leaks upstream.
	callback.search = ''

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

	// Stash the post-login destination first-party (it never travels to the OAuth
	// provider). Clear any stale value when this sign-in has no target so an
	// abandoned attempt can't bounce a later login somewhere unexpected.
	const redirectTo = sanitizeRedirect(url.searchParams.get('redirect'))
	if (redirectTo) {
		cookies.set('redirect', redirectTo, {
			httpOnly: true,
			maxAge: 60 * 60,
			sameSite: 'lax',
			path: '/',
			secure: import.meta.env.PROD
		})
	} else {
		cookies.delete('redirect', {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			secure: import.meta.env.PROD
		})
	}

	return new Response(undefined, {
		status: 302,
		headers: {
			location: `${authEndpoint}/?${q.toString()}`
		}
	})
}
