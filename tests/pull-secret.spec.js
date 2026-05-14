import { test, expect, setMocks } from './helpers.js'
import { samplePullSecret } from './fixtures/mocks.js'

test.describe('pull secrets', () => {
	test('lists pull secrets', async ({ page }) => {
		await setMocks({
			'pullSecret.list': {
				ok: true,
				result: { items: [samplePullSecret] }
			}
		})

		await page.goto('/pull-secret?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Pull Secrets' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'gcr' })).toBeVisible()
	})

	test('empty state when no pull secrets', async ({ page }) => {
		await page.goto('/pull-secret?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No data')).toBeVisible()
	})
})
