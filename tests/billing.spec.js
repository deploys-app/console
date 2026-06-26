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

		// Each line is one project: # | project name | gross amount (right-aligned).
		const webRow = page.locator('table tbody tr', { hasText: 'Web frontend' })
		await expect(webRow.locator('td').nth(2)).toHaveText('9.00 USD')

		const apiRow = page.locator('table tbody tr', { hasText: 'API service' })
		await expect(apiRow.locator('td').nth(2)).toHaveText('1.70 USD')
	})

	test('shows how-to-pay payment details on an open invoice', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice }, // status: open
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')

		// The bank-transfer / PromptPay details are visible inline — no PDF needed.
		await expect(page.getByRole('heading', { name: 'How to pay' })).toBeVisible()
		await expect(page.getByText('Test Bank')).toBeVisible()
		await expect(page.getByText('1234567890')).toBeVisible()
		await expect(page.getByText('0812345678')).toBeVisible()
	})

	test('hides the how-to-pay panel on a paid invoice', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: { ...sampleInvoice, status: 'paid', paidAt: '2026-05-03T00:00:00Z' } },
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')

		// Payment instructions only matter while the invoice is still payable.
		await expect(page.getByRole('heading', { name: 'How to pay' })).toHaveCount(0)
	})

	test('pay modal shows the transfer-to account details', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice }, // status: open
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Pay' }).click()

		// The destination account a customer must transfer to is shown in the modal
		// itself, so paying never requires opening the PDF.
		const modal = page.locator('.modal.is-active .modal-panel')
		await expect(modal.getByText('Transfer to')).toBeVisible()
		await expect(modal.getByText('10.70 USD')).toBeVisible()
		await expect(modal.getByText('1234567890')).toBeVisible()
		await expect(modal.getByText('0812345678')).toBeVisible()
	})

	test('shows a PromptPay QR in the pay modal for a THB invoice', async ({ page }) => {
		await setMocks({
			// PromptPay settles in THB, so the QR only renders for THB invoices.
			'billing.getInvoice': { ok: true, result: { ...sampleInvoice, currency: 'THB' } },
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Pay' }).click()

		const modal = page.locator('.modal.is-active .modal-panel')
		await expect(modal.getByRole('img', { name: 'PromptPay QR code' })).toBeVisible()
		await expect(modal.getByText('Scan with any Thai mobile banking app')).toBeVisible()
	})

	test('hides the PromptPay QR for a non-THB invoice', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice }, // currency: USD
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Pay' }).click()

		const modal = page.locator('.modal.is-active .modal-panel')
		await expect(modal.getByText('Transfer to')).toBeVisible()
		await expect(modal.getByRole('img', { name: 'PromptPay QR code' })).toHaveCount(0)
	})

	test('truncates a long slip file name instead of widening the modal', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice }, // status: open
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')
		await page.getByRole('button', { name: 'Pay' }).click()

		// A long, unbreakable (no-spaces) name is the worst case: without min-width:0
		// on the selected-file row it pushes the whole modal wider than its panel.
		await page.locator('input[type=file]').setInputFiles({
			name: 'transfer-slip-payment-confirmation-screenshot-from-mobile-banking-app-INV-2026-0009-original-highres.pdf',
			mimeType: 'application/pdf',
			buffer: Buffer.from('%PDF-1.4 mock slip')
		})

		const name = page.locator('.selected-file .file-name')
		await expect(name).toBeVisible()

		// The name must be clipped (scrollWidth > clientWidth = ellipsis active) and
		// the row must not exceed the modal panel's inner width.
		const m = await page.evaluate(() => {
			const n = document.querySelector('.selected-file .file-name')
			const panel = document.querySelector('.modal.is-active .modal-panel')
			return {
				ellipsized: n.scrollWidth > n.clientWidth,
				rowWidth: document.querySelector('.selected-file').getBoundingClientRect().width,
				panelWidth: panel.getBoundingClientRect().width
			}
		})
		expect(m.ellipsized).toBe(true)
		expect(m.rowWidth).toBeLessThanOrEqual(m.panelWidth)
	})

	test('hides the receipt button on unpaid invoices', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: sampleInvoice }, // status: open
			'billing.get': { ok: true, result: sampleBillingAccount }
		})

		await page.goto('/billing/invoice?id=inv-1')

		await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Download receipt' })).toHaveCount(0)
	})

	test('shows the receipt button on paid invoices and calls billing.downloadReceipt', async ({ page }) => {
		await setMocks({
			'billing.getInvoice': { ok: true, result: { ...sampleInvoice, status: 'paid', paidAt: '2026-05-03T00:00:00Z' } },
			'billing.get': { ok: true, result: sampleBillingAccount },
			// Error response proves the click reaches billing.downloadReceipt and
			// its message surfaces (success would navigate away to the file URL).
			'billing.downloadReceipt': { ok: false, error: { message: 'api: invoice pdf export is not available' } }
		})

		await page.goto('/billing/invoice?id=inv-1')

		const btn = page.getByRole('button', { name: 'Download receipt' })
		await expect(btn).toBeVisible()
		await btn.click()
		await expect(page.locator('#swal2-html-container')).toHaveText(/invoice pdf export is not available/)
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
