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

/**
 * Safari / iOS WebKit drops a `Set-Cookie` carried on a response that redirects
 * cross-origin, so those browsers lose the `state` cookie when /auth/signin
 * 302's straight to auth.deploys.app. They need the same-origin cookie-commit
 * interstitial. Chromium (Chrome/Edge/Opera) and Firefox on desktop are
 * unaffected and keep the faster direct redirect. All iOS browsers are WebKit,
 * so they're included regardless of brand.
 * @param {string | null} ua
 * @returns {boolean}
 */
function isWebKit (ua) {
	if (!ua) return false
	if (/iPhone|iPad|iPod/.test(ua)) return true
	return /\bSafari\b/.test(ua) && /\bVersion\//.test(ua) && !/Chrom(e|ium)|Android|Edg\//.test(ua)
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url, request }) {
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

	const authUrl = `${authEndpoint}/?${q.toString()}`

	// Safari/WebKit drops a Set-Cookie carried on a cross-origin redirect, so the
	// `state` cookie set above would be lost if we 302'd straight to the auth
	// host. For those browsers, commit the cookie on a normal same-origin 200 and
	// redirect from the client; everyone else keeps the faster direct 302.
	if (isWebKit(request.headers.get('user-agent'))) {
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

	return new Response(undefined, {
		status: 302,
		headers: {
			location: authUrl,
			'cache-control': 'no-store'
		}
	})
}
