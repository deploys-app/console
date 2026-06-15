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

/**
 * base64url encodes bytes without padding (RFC 4648 §5) — the encoding PKCE uses.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base64url (bytes) {
	let s = ''
	for (const b of bytes) {
		s += String.fromCharCode(b)
	}
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * randomCodeVerifier returns a high-entropy PKCE code_verifier (RFC 7636):
 * base64url of 32 random bytes (43 chars, within the 43–128 range).
 * @returns {string}
 */
function randomCodeVerifier () {
	const x = new Uint8Array(32)
	webcrypto.getRandomValues(x)
	return base64url(x)
}

/**
 * codeChallengeS256 derives the S256 PKCE code_challenge from a verifier:
 * base64url(SHA-256(verifier)), no padding (RFC 7636 §4.2). auth verifies this
 * at /token against the code_verifier we present in the callback.
 * @param {string} verifier
 * @returns {Promise<string>}
 */
async function codeChallengeS256 (verifier) {
	const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
	return base64url(new Uint8Array(digest))
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url }) {
	const state = randomState()

	// PKCE (OAuth 2.1): console stays a confidential client (it still sends its
	// client_secret at /token), but we add a code_challenge so an intercepted
	// authorization code can't be redeemed without the verifier held here.
	const codeVerifier = randomCodeVerifier()
	const codeChallenge = await codeChallengeS256(codeVerifier)

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
	q.set('code_challenge', codeChallenge)
	q.set('code_challenge_method', 'S256')

	cookies.set('state', state, {
		httpOnly: true,
		maxAge: 60 * 60,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	// The verifier never leaves us; it is replayed to /token in the callback to
	// prove this is the same client that started the flow.
	cookies.set('code_verifier', codeVerifier, {
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
