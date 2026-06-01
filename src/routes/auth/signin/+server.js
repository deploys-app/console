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

	const webkit = isWebKit(request.headers.get('user-agent'))

	// TEMPORARY diagnostic — remove once the Safari "invalid state" issue is
	// understood.
	console.warn('[auth-debug] signin ' + JSON.stringify({
		state,
		secure: import.meta.env.PROD,
		webkit
	}))

	// Safari/WebKit needs two things the other engines don't:
	//   1. SameSite=None+Secure, so the cookie is sent back on the cross-site
	//      OAuth redirect to /auth/callback. WebKit does NOT send a SameSite=Lax
	//      cookie on a cross-site redirect (that's why the Lax `state` was
	//      dropped while the attribute-less `project` cookie — unrestricted in
	//      Safari — came through).
	//   2. The cookie committed on a same-origin 200 (below), because WebKit
	//      drops a Set-Cookie carried on a cross-origin redirect response.
	// Other engines keep the more conservative Lax + a direct 302.
	cookies.set('state', state, {
		httpOnly: true,
		maxAge: 60 * 60,
		sameSite: webkit ? 'none' : 'lax',
		path: '/',
		secure: webkit || import.meta.env.PROD
	})

	const authUrl = `${authEndpoint}/?${q.toString()}`

	if (webkit) {
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
