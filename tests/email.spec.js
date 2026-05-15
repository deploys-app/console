import { test, expect, setMocks } from './helpers.js'
import { sampleEmailDomain } from './fixtures/mocks.js'

test.describe('email domains', () => {
	test('lists email domains', async ({ page }) => {
		await setMocks({
			'email.list': {
				ok: true,
				result: { items: [sampleEmailDomain] }
			}
		})

		await page.goto('/email?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Emails' })).toBeVisible()
		await expect(main.getByText('mail.example.com')).toBeVisible()
	})

	test('empty state when no email domains', async ({ page }) => {
		await page.goto('/email?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No data')).toBeVisible()
	})
})
