import { test as base, expect } from '@playwright/test'

const MOCK_PORT = Number(process.env.MOCK_PORT || 9999)
const MOCK_URL = `http://localhost:${MOCK_PORT}`

/**
 * Reset the mock server to its default responses.
 */
export async function resetMocks () {
	const res = await fetch(`${MOCK_URL}/__reset`, { method: 'POST' })
	if (!res.ok) throw new Error(`failed to reset mocks: ${res.status}`)
}

/**
 * Configure mock responses for specific API paths.
 *
 * Keys can be with or without a leading slash, e.g. `deployment.list`
 * or `/deployment.list`.
 *
 * @param {Record<string, unknown>} overrides
 */
export async function setMocks (overrides) {
	const res = await fetch(`${MOCK_URL}/__set`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(overrides)
	})
	if (!res.ok) throw new Error(`failed to set mocks: ${res.status}`)
}

/**
 * Fetch the mock server's request log (every upstream call since the last
 * reset), so a test can assert what the page sent — e.g. the `waf.set` body.
 *
 * @returns {Promise<{ path: string, method: string, body: string }[]>}
 */
export async function getRequestLog () {
	const res = await fetch(`${MOCK_URL}/__log`)
	if (!res.ok) throw new Error(`failed to read request log: ${res.status}`)
	return res.json()
}

/**
 * Pick an option from the custom `Select.svelte` dropdown (a button trigger +
 * listbox, not a native `<select>` — Playwright's `selectOption` can't drive
 * it). Opens the trigger by id, then clicks the option matching `label`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} triggerId  the Select's `id` (without the leading `#`)
 * @param {string} label      the visible option label to pick
 */
export async function pickSelect (page, triggerId, label) {
	await page.locator(`#${triggerId}`).click()
	await page.getByRole('option', { name: label, exact: true }).click()
}

/**
 * Inject the auth token cookie so the SvelteKit `(auth)` group treats
 * the session as authenticated.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
export async function signIn (context) {
	await context.addCookies([
		{
			name: 'token',
			value: 'test-token',
			url: 'http://localhost:4173',
			httpOnly: true,
			sameSite: 'Lax'
		},
		{
			name: 'theme',
			value: 'dark',
			url: 'http://localhost:4173',
			sameSite: 'Lax'
		}
	])
}

/**
 * Test fixture variants:
 *  - `test`            — default. Resets mocks before each test, signs in.
 *  - `unauthedTest`    — resets mocks, but does NOT inject an auth cookie.
 */
export const test = base.extend({
	context: async ({ context }, use) => {
		await resetMocks()
		await signIn(context)
		await use(context)
	}
})

export const unauthedTest = base.extend({
	context: async ({ context }, use) => {
		await resetMocks()
		await use(context)
	}
})

export { expect }
