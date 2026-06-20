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
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'email.list': { ok: false, error: { message: 'api: internal error' } }
		})
		await page.goto('/email?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('api: internal error')).toBeVisible()
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'email.list': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/email?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})
})
