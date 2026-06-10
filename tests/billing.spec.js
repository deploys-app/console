import { test, expect, setMocks } from './helpers.js'
import { sampleBillingAccount, sampleInvoice } from './fixtures/mocks.js'

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

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Billing' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Personal' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Company' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/billing/create')
	})

	test('empty state when no billing accounts', async ({ page }) => {
		await page.goto('/billing')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})
})

test.describe('invoice detail', () => {
	test('lists line items grouped by project (project + amount)', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice },
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')

		// Each line is one project: name in the first column, gross amount in the second.
		const webRow = page.locator('table tbody tr', { hasText: 'Web frontend' })
		await expect(webRow.locator('td').nth(1)).toHaveText('9.00 USD')

		const apiRow = page.locator('table tbody tr', { hasText: 'API service' })
		await expect(apiRow.locator('td').nth(1)).toHaveText('1.70 USD')
	})

	test('surfaces a clear message when PDF download fails with an empty 500', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice },
			'billing.get': { ok: true, result: sampleBillingAccount },
			// arpc encodes an unexpected server error as a blank body on a 500.
			'billing.downloadInvoice': { __status: 500, ok: false, error: {} }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Download PDF' }).click()

		// The empty error must not produce a blank "Oops…" dialog.
		await expect(page.locator('.swal2-popup')).toBeVisible()
		await expect(page.locator('#swal2-html-container')).toHaveText(/Could not download the invoice PDF/)
	})

	test('shows the API message when PDF download returns a typed error', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice },
			'billing.get': { ok: true, result: sampleBillingAccount },
			'billing.downloadInvoice': { ok: false, error: { message: 'api: invoice pdf export is not available' } }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Download PDF' }).click()

		await expect(page.locator('#swal2-html-container')).toHaveText(/invoice pdf export is not available/)
	})
})
