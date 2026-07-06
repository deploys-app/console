import { test as base, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const MOCK_PORT = Number(process.env.MOCK_PORT || 9999)
const MOCK_URL = `http://localhost:${MOCK_PORT}`

/**
 * Per-test mock-state key. The mock server (tests/mock-server.js) buckets its
 * responses + request-log by this key so tests can run on PARALLEL workers
 * without sharing state.
 *
 * It is kept module-level (not threaded through every call) on purpose: a
 * Playwright worker runs its tests serially in a single process, so only one
 * test is ever active per worker, and each worker is its own process with its
 * own copy of this module. That makes a module-level "current key" race-free
 * and lets `resetMocks` / `setMocks` / `getRequestLog` keep their original
 * argument-free signatures — the ~290 call sites across the specs are untouched.
 * The same key is also written to the `mock_key` cookie (see `setMockKeyCookie`)
 * so the /api proxy forwards it as `x-mock-key` on every data request.
 */
let currentKey = 'default'
function keyQuery () { return `key=${encodeURIComponent(currentKey)}` }

/**
 * Reset the current test's mock bucket to its default responses.
 */
export async function resetMocks () {
	const res = await fetch(`${MOCK_URL}/__reset?${keyQuery()}`, { method: 'POST' })
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
	const res = await fetch(`${MOCK_URL}/__set?${keyQuery()}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(overrides)
	})
	if (!res.ok) throw new Error(`failed to set mocks: ${res.status}`)
}

/**
 * Fetch the current test's request log (every upstream call since the last
 * reset), so a test can assert what the page sent — e.g. the `waf.set` body.
 *
 * @returns {Promise<{ path: string, method: string, body: string }[]>}
 */
export async function getRequestLog () {
	const res = await fetch(`${MOCK_URL}/__log?${keyQuery()}`)
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
 * Inject the per-test `mock_key` cookie (same scope as the token cookie) so the
 * /api proxy forwards it as `x-mock-key` and the mock server routes both SSR and
 * client requests to this test's bucket.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} key
 */
export async function setMockKeyCookie (context, key) {
	await context.addCookies([
		{
			name: 'mock_key',
			value: key,
			url: 'http://localhost:4173',
			httpOnly: true,
			sameSite: 'Lax'
		}
	])
}

/**
 * Test fixture variants:
 *  - `test`            — default. Resets mocks before each test, signs in.
 *  - `unauthedTest`    — resets mocks, but does NOT inject an auth cookie.
 *
 * Both mint a fresh per-test key (race-free: see `currentKey` above), set it as
 * the `mock_key` cookie, and reset that bucket — so each test starts from a
 * clean, isolated copy of the default mocks even under parallel workers.
 */
/**
 * Wrap `page.goto` so it resolves only after the SvelteKit client has hydrated
 * (the root layout sets `<html data-hydrated>` in `onMount`). Web-first
 * assertions auto-wait for elements, but one-shot inputs — `keyboard.press('/')`
 * to open the palette, a click that opens a custom Select — are dispatched once
 * and lost if they land before hydration wires the handlers. Under the Vite dev
 * server's on-demand compilation with many parallel workers, hydration lags well
 * behind the SSR paint the tests gate on, so those inputs raced and the run
 * flaked (a different modal-driven test each time). Gating every navigation on
 * hydration removes the race for all specs at once, with no per-test changes.
 */
function withHydrationGate (page) {
	const origGoto = page.goto.bind(page)
	page.goto = async (url, opts) => {
		const res = await origGoto(url, opts)
		await page.locator('html[data-hydrated]').waitFor({ state: 'attached', timeout: 20_000 })
		return res
	}
	return page
}

export const test = base.extend({
	context: async ({ context }, use) => {
		currentKey = randomUUID()
		await setMockKeyCookie(context, currentKey)
		await signIn(context)
		await resetMocks()
		await use(context)
	},
	page: async ({ page }, use) => {
		await use(withHydrationGate(page))
	}
})

export const unauthedTest = base.extend({
	context: async ({ context }, use) => {
		currentKey = randomUUID()
		await setMockKeyCookie(context, currentKey)
		await resetMocks()
		await use(context)
	},
	page: async ({ page }, use) => {
		await use(withHydrationGate(page))
	}
})

export { expect }
