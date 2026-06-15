import { env } from '$env/dynamic/private'
import { sanitizeRedirect } from '$lib/server/redirect'

const authEndpoint = env.AUTH_ENDPOINT || 'https://auth.deploys.app'

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url }) {
	const state = url.searchParams.get('state') ?? ''
	const code = url.searchParams.get('code') ?? ''

	if (state !== cookies.get('state')) {
		return new Response('invalid state', { status: 400 })
	}

	// PKCE: replay the verifier minted at /auth/signin so auth can bind this code
	// to the client that started the flow (it stays a confidential exchange — the
	// client_secret is still sent). Clear it up front so it's dropped on every
	// exit path — success, a non-2xx /token relay, or a throw — not just success.
	const codeVerifier = cookies.get('code_verifier') ?? ''
	cookies.delete('code_verifier', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	// exchange token
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		client_id: env.OAUTH2_CLIENT_ID,
		code_verifier: codeVerifier
	})
	// Confidential clients (e.g. production) authenticate with a secret; public
	// clients — local/contributor setups with no secret — rely on PKCE alone, so
	// only send client_secret when one is configured.
	if (env.OAUTH2_CLIENT_SECRET) {
		body.set('client_secret', env.OAUTH2_CLIENT_SECRET)
	}

	const resp = await fetch(`${authEndpoint}/token`, {
		method: 'POST',
		body,
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		}
	})
	if (resp.status < 200 || resp.status > 299) {
		return resp
	}
	const respBody = await resp.json()
	// OAuth 2.1 returns the bearer as access_token; refresh_token is the legacy
	// alias auth still sets, kept as a fallback during the rollout.
	const token = respBody.access_token || respBody.refresh_token
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

	// Return the user to where they were headed before sign-in. Re-validate at the
	// point of use (the cookie is the open-redirect sink) and fall back to home.
	const redirectTo = sanitizeRedirect(cookies.get('redirect')) || '/'
	cookies.delete('redirect', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: redirectTo
		}
	})
}
