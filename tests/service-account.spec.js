import { test, expect, setMocks } from './helpers.js'
import { sampleServiceAccount } from './fixtures/mocks.js'

test.describe('service accounts', () => {
	test('lists service accounts', async ({ page }) => {
		await setMocks({
			'serviceAccount.list': {
				ok: true,
				result: { items: [sampleServiceAccount] }
			}
		})

		await page.goto('/service-account?project=test-project')

		await expect(page.getByRole('heading', { name: 'Service Accounts' })).toBeVisible()
		await expect(page.getByRole('link', { name: '[email protected]' })).toBeVisible()
		await expect(page.getByText('CI bot')).toBeVisible()
	})

	test('empty state when no service accounts', async ({ page }) => {
		await page.goto('/service-account?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
