import { test, unauthedTest, expect, setMocks } from './helpers.js'

unauthedTest.describe('unauthenticated access', () => {
	unauthedTest('auto-redirects a first-time visitor (no token) to /auth/signin, remembering the path', async ({ page }) => {
		// A fresh visitor with no session cookie is bounced straight to sign-in —
		// no interstitial. (The unauthorized page is only for an expired session.)
		const resp = await page.request.get('/?project=test-project', { maxRedirects: 0 })
		expect([301, 302, 303, 307, 308]).toContain(resp.status())
		const loc = new URL(resp.headers().location, 'http://localhost')
		expect(loc.pathname).toBe('/auth/signin')
		expect(loc.searchParams.get('redirect')).toBe('/?project=test-project')
	})

	unauthedTest('auto-redirects a first-time visitor from the project list as well', async ({ page }) => {
		const resp = await page.request.get('/project', { maxRedirects: 0 })
		expect([301, 302, 303, 307, 308]).toContain(resp.status())
		const loc = new URL(resp.headers().location, 'http://localhost')
		expect(loc.pathname).toBe('/auth/signin')
		expect(loc.searchParams.get('redirect')).toBe('/project')
	})

	unauthedTest('/auth/signin redirects to the OAuth provider', async ({ page }) => {
		const resp = await page.request.get('/auth/signin', { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		// AUTH_ENDPOINT defaults to https://auth.deploys.app but tests
		// override it to the mock; assert on the OAuth params instead.
		const location = resp.headers().location || ''
		expect(location).toMatch(/response_type=code/)
		expect(location).toMatch(/client_id=test-client/)
		expect(location).toMatch(/redirect_uri=/)
		expect(location).toMatch(/state=[0-9a-f]+/)
		// our own ?redirect= must never leak into the OAuth redirect_uri
		const redirectUri = new URL(location).searchParams.get('redirect_uri') || ''
		expect(redirectUri).not.toContain('redirect=')
	})
})

unauthedTest.describe('post-login redirect', () => {
	/** Read a Set-Cookie value off an APIResponse, undoing SvelteKit's encoding. */
	function readSetCookie (resp, name) {
		const header = resp.headersArray()
			.filter((h) => h.name.toLowerCase() === 'set-cookie')
			.map((h) => h.value)
			.find((v) => v.startsWith(`${name}=`))
		if (!header) return undefined
		return decodeURIComponent(header.split(';')[0].slice(name.length + 1))
	}

	unauthedTest('signin records a safe redirect target', async ({ page }) => {
		const target = '/deployment?project=foo'
		const resp = await page.request.get('/auth/signin?redirect=' + encodeURIComponent(target), { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		expect(readSetCookie(resp, 'redirect')).toBe(target)
	})

	unauthedTest('signin refuses an off-site redirect target', async ({ page }) => {
		const resp = await page.request.get('/auth/signin?redirect=' + encodeURIComponent('https://evil.example/phish'), { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		// either no redirect cookie, or a cleared one — never the off-site value
		expect(readSetCookie(resp, 'redirect') || '').toBe('')
	})

	unauthedTest('callback returns the user to the remembered page', async ({ context, page }) => {
		await context.addCookies([
			{ name: 'state', value: 'test-state', domain: 'localhost', path: '/', sameSite: 'Lax' },
			{ name: 'redirect', value: '/deployment?project=foo', domain: 'localhost', path: '/', sameSite: 'Lax' }
		])
		const resp = await page.request.get('/auth/callback?code=test-code&state=test-state', { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		expect(resp.headers().location).toBe('/deployment?project=foo')
	})

	unauthedTest('callback falls back to home without a remembered page', async ({ context, page }) => {
		await context.addCookies([
			{ name: 'state', value: 'test-state', domain: 'localhost', path: '/', sameSite: 'Lax' }
		])
		const resp = await page.request.get('/auth/callback?code=test-code&state=test-state', { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		expect(resp.headers().location).toBe('/')
	})

	unauthedTest('callback ignores an unsafe remembered value', async ({ context, page }) => {
		await context.addCookies([
			{ name: 'state', value: 'test-state', domain: 'localhost', path: '/', sameSite: 'Lax' },
			{ name: 'redirect', value: 'https://evil.example/phish', domain: 'localhost', path: '/', sameSite: 'Lax' }
		])
		const resp = await page.request.get('/auth/callback?code=test-code&state=test-state', { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		expect(resp.headers().location).toBe('/')
	})
})

test.describe('signed-in user', () => {
	test('redirects "/" to /project when no project is selected', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveURL(/\/project$/)
	})

	test('renders an error when me.get fails', async ({ page }) => {
		await setMocks({
			'me.get': { ok: false, error: { message: 'internal error' } }
		})
		const resp = await page.goto('/project')
		expect(resp?.status()).toBeGreaterThanOrEqual(500)
	})

	test('shows the unauthorized page (not a redirect) on a deep link when the session token is rejected', async ({ page }) => {
		// `test` fixture is signed in (token cookie present), but the API rejects it
		// — an expired session. On a deep link this surfaces the "Sign in to
		// continue" page with a manual Sign in link, not an auto-redirect.
		await setMocks({
			'me.get': { ok: false, error: { message: 'api: unauthorized' } }
		})
		const resp = await page.goto('/project')
		expect(resp?.status()).toBe(401)
		const signin = page.getByRole('link', { name: 'Sign in' })
		await expect(signin).toBeVisible()
		const href = new URL(await signin.getAttribute('href') ?? '', 'http://localhost')
		expect(href.pathname).toBe('/auth/signin')
		expect(href.searchParams.get('redirect')).toBe('/project')
	})

	test('auto-redirects to /auth/signin from "/" even with an expired token (no interstitial)', async ({ page }) => {
		// The bare root is just a router, so it always bounces to sign-in — an
		// expired session here gets the redirect, not the "Sign in to continue" page.
		await setMocks({
			'me.get': { ok: false, error: { message: 'api: unauthorized' } }
		})
		const resp = await page.request.get('/', { maxRedirects: 0 })
		expect([301, 302, 303, 307, 308]).toContain(resp.status())
		const loc = new URL(resp.headers().location, 'http://localhost')
		expect(loc.pathname).toBe('/auth/signin')
		expect(loc.searchParams.get('redirect')).toBeNull()
	})
})
