import { test, unauthedTest, expect, setMocks } from './helpers.js'

unauthedTest.describe('unauthenticated access', () => {
	unauthedTest('redirects to /auth/signin when there is no token', async ({ page }) => {
		const resp = await page.request.get('/?project=test-project', { maxRedirects: 0 })
		expect([301, 302, 303, 307, 308]).toContain(resp.status())
		expect(resp.headers().location).toBe('/auth/signin')
	})

	unauthedTest('redirects to /auth/signin from the project list as well', async ({ page }) => {
		const resp = await page.request.get('/project', { maxRedirects: 0 })
		expect([301, 302, 303, 307, 308]).toContain(resp.status())
		expect(resp.headers().location).toBe('/auth/signin')
	})

	unauthedTest('/auth/signin redirects to the OAuth provider', async ({ page }) => {
		const resp = await page.request.get('/auth/signin', { maxRedirects: 0 })
		expect(resp.status()).toBe(302)
		expect(resp.headers().location || '').toMatch(/^https:\/\/auth\.deploys\.app\//)
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
})
