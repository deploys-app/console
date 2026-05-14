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

		await expect(page.getByRole('heading', { name: 'Pull Secrets' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'gcr' })).toBeVisible()
	})

	test('empty state when no pull secrets', async ({ page }) => {
		await page.goto('/pull-secret?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
