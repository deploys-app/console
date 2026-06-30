import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { sampleScopedToken } from './fixtures/mocks.js'

test.describe('scoped tokens', () => {
	test('lists the caller\'s active scoped tokens', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: true, result: { items: [sampleScopedToken] } }
		})

		await page.goto('/scoped-token?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Scoped Tokens' })).toBeVisible()
		await expect(main.getByText('tok_test123')).toBeVisible()
		await expect(main.getByText('claude-code:pr-42')).toBeVisible()
		await expect(main.getByText('deployment.get')).toBeVisible()
	})

	test('empty state when there are no tokens', async ({ page }) => {
		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No active scoped tokens')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: false, error: { message: 'api: internal error' } }
		})

		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()
		await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible()
	})

	test('Try again recovers the list after a transient error', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: false, error: { message: 'api: internal error' } }
		})

		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()

		await setMocks({
			'me.listTokens': { ok: true, result: { items: [sampleScopedToken] } }
		})
		await main.getByRole('button', { name: 'Try again' }).click()

		await expect(main.getByText('tok_test123')).toBeVisible()
		await expect(main.getByText(/Something went wrong while loading this data/)).toHaveCount(0)
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: false, error: { message: 'iam: forbidden' } }
		})

		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})

	test('revoke confirms then calls me.revokeToken and refreshes', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: true, result: { items: [sampleScopedToken] } },
			'me.revokeToken': { ok: true, result: {} }
		})

		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('tok_test123')).toBeVisible()

		// After revoke, the list reloads to empty.
		await setMocks({ 'me.listTokens': { ok: true, result: { items: [] } } })

		await main.getByRole('button', { name: 'Revoke' }).click()
		await page.locator('#app-modal-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/me.revokeToken' && JSON.parse(r.body || '{}').id === 'tok_test123')
		}).toBe(true)

		await expect(main.getByText('No active scoped tokens')).toBeVisible()
	})

	test('shows the API error in a modal when revoke fails', async ({ page }) => {
		await setMocks({
			'me.listTokens': { ok: true, result: { items: [sampleScopedToken] } },
			'me.revokeToken': { ok: false, error: { message: 'api: internal error' } }
		})

		await page.goto('/scoped-token?project=test-project')
		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Revoke' }).click()
		await page.locator('#app-modal-confirm').click()

		await expect(page.locator('#app-modal')).toBeVisible()
		await expect(page.locator('#app-modal')).toContainText('api: internal error')
	})
})
