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

		await expect(page.getByRole('heading', { name: 'Emails' })).toBeVisible()
		await expect(page.getByText('mail.example.com')).toBeVisible()
	})

	test('empty state when no email domains', async ({ page }) => {
		await page.goto('/email?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
