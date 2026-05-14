import { test, expect, setMocks } from './helpers.js'
import { sampleBillingAccount } from './fixtures/mocks.js'

test.describe('billing accounts', () => {
	test('lists billing accounts', async ({ page }) => {
		await setMocks({
			'billing.list': {
				ok: true,
				result: {
					items: [
						sampleBillingAccount,
						{ ...sampleBillingAccount, id: 'ba-2', name: 'Company', active: false }
					]
				}
			}
		})

		await page.goto('/billing')

		await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Personal' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Company' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/billing/create')
	})

	test('empty state when no billing accounts', async ({ page }) => {
		await page.goto('/billing')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
