import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { defaultProject } from './fixtures/mocks.js'

test.describe('project list', () => {
	test('lists projects returned from the API', async ({ page }) => {
		await setMocks({
			'project.list': {
				ok: true,
				result: {
					items: [
						defaultProject,
						{ ...defaultProject, id: '2', project: 'another', name: 'Another' }
					]
				}
			}
		})

		await page.goto('/project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Test Project' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Another' })).toBeVisible()
		await expect(main.locator('.project-open')).toHaveCount(2)
	})

	test('shows the no-data row when there are no projects', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [] } }
		})

		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(main.getByText('No projects yet')).toBeVisible()
	})

	test('exposes the create-project link', async ({ page }) => {
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'New project' }).first()).toHaveAttribute('href', '/project/create')
	})

	test('opens the project search modal with the "/" shortcut', async ({ page }) => {
		await setMocks({
			'project.list': {
				ok: true,
				result: {
					items: [
						defaultProject,
						{ ...defaultProject, id: '2', project: 'another', name: 'Another' }
					]
				}
			}
		})

		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		// Clicking the search button opens the modal (and confirms the page has
		// hydrated, so the global "/" listener is attached before we press it).
		await main.getByRole('button', { name: /Search projects/ }).click()
		await expect(page.locator('.modal.is-active')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		// The "/" shortcut opens the same search modal.
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		const search = dialog.getByPlaceholder(/Search projects/)
		await expect(search).toBeFocused()

		// Typing filters the list.
		await search.fill('another')
		await expect(dialog.getByRole('link', { name: 'Another' })).toBeVisible()
		await expect(dialog.getByRole('link', { name: 'Test Project' })).toHaveCount(0)

		// Escape closes it.
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})
})

test.describe('project delete (type-to-confirm)', () => {
	test('the Delete prompt stays gated until the exact project id is typed', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [defaultProject] } },
			'project.delete': { ok: true, result: true }
		})
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Remove' }).click()

		const dialog = page.locator('#app-modal')
		const confirm = page.locator('#app-modal-confirm')
		const input = page.locator('#app-modal-input')
		await expect(dialog).toBeVisible()
		// Delete is disabled until the typed name matches the project id exactly.
		await expect(confirm).toBeDisabled()

		await input.fill('wrong-name')
		await expect(confirm).toBeDisabled()
		// Enter on a non-match must neither close nor delete.
		await input.press('Enter')
		await expect(dialog).toBeVisible()
		expect((await getRequestLog()).some((r) => r.path === '/project.delete')).toBe(false)

		await input.fill('test-project')
		await expect(confirm).toBeEnabled()
		await confirm.click()

		await expect.poll(async () =>
			(await getRequestLog()).some((r) => r.path === '/project.delete')
		).toBe(true)
	})

	test('Cancel dismisses the Delete prompt without deleting', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [defaultProject] } },
			'project.delete': { ok: true, result: true }
		})
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Remove' }).click()
		await expect(page.locator('#app-modal')).toBeVisible()

		await page.getByRole('button', { name: 'Cancel' }).click()
		await expect(page.locator('#app-modal')).toBeHidden()
		expect((await getRequestLog()).some((r) => r.path === '/project.delete')).toBe(false)
	})
})

// Issue date is the 1st UTC of a month relative to now. Due date is the 1st of
// the following month, so monthsAgo 0 is still awaiting payment, monthsAgo 1+
// is overdue, and monthsAgo 7 has been overdue for 6 months.
function issuedMonthsAgo (monthsAgo) {
	const now = new Date()
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1)).toISOString()
}

function invoiceItem ({ id, status, monthsAgo }) {
	const issuedAt = issuedMonthsAgo(monthsAgo)
	return {
		id,
		number: id,
		receiptNumber: '',
		currency: 'THB',
		periodStart: issuedAt,
		periodEnd: issuedAt,
		subtotal: 100,
		taxAmount: 7,
		total: 107,
		status,
		issuedAt,
		paidAt: '',
		voidedAt: '',
		createdAt: issuedAt
	}
}

test.describe('project dashboard', () => {
	test('renders when a project is selected', async ({ page }) => {
		await page.goto('/?project=test-project')
		await expect(page).toHaveURL(/\?project=test-project/)
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
		await expect(main.getByRole('status')).toHaveCount(0)
		await expect(main.getByRole('alert')).toHaveCount(0)
	})

	test('warns when an invoice is awaiting payment', async ({ page }) => {
		await setMocks({
			'billing.listInvoices': {
				ok: true,
				result: { items: [invoiceItem({ id: 'inv-new', status: 'pending', monthsAgo: 0 })] }
			}
		})
		await page.goto('/?project=test-project')
		const main = page.locator('.content-wrapper')
		const notice = main.getByRole('status')
		await expect(notice).toBeVisible()
		await expect(notice).toContainText('1 invoice is awaiting payment')
		await expect(notice).toContainText('An invoice overdue for 6 months will pause this project.')
		await expect(notice).not.toContainText('has been overdue for 6 months')
		await expect(main.getByRole('alert')).toHaveCount(0)
		await expect(notice.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/billing/invoice?id=inv-new')
		await expect(notice.getByRole('link', { name: 'View invoices' })).toHaveAttribute('href', '/billing/invoices?id=ba-1')
	})

	test('warns for up to three overdue invoices and links the oldest', async ({ page }) => {
		await setMocks({
			'billing.listInvoices': {
				ok: true,
				result: {
					items: [
						invoiceItem({ id: 'inv-current', status: 'open', monthsAgo: 0 }),
						invoiceItem({ id: 'inv-newer', status: 'open', monthsAgo: 1 }),
						invoiceItem({ id: 'inv-oldest', status: 'pending', monthsAgo: 3 }),
						invoiceItem({ id: 'inv-mid', status: 'open', monthsAgo: 2 }),
						invoiceItem({ id: 'inv-paid', status: 'paid', monthsAgo: 4 })
					]
				}
			}
		})
		await page.goto('/?project=test-project')
		const main = page.locator('.content-wrapper')
		const notice = main.getByRole('status')
		await expect(notice).toContainText('3 invoices are overdue')
		await expect(notice).toContainText('1 invoice is still awaiting payment.')
		await expect(notice).toContainText('An invoice overdue for 6 months will pause this project.')
		await expect(notice.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/billing/invoice?id=inv-oldest')
		await expect(main.getByRole('alert')).toHaveCount(0)
	})

	test('alerts when more than three invoices are overdue', async ({ page }) => {
		await setMocks({
			'billing.listInvoices': {
				ok: true,
				result: {
					items: [1, 2, 3, 4].map((n) => invoiceItem({ id: `inv-${n}`, status: 'open', monthsAgo: n }))
				}
			}
		})
		await page.goto('/?project=test-project')
		const main = page.locator('.content-wrapper')
		const notice = main.getByRole('alert')
		await expect(notice).toBeVisible()
		await expect(notice).toContainText('4 invoices are overdue')
		await expect(notice).toContainText('Pay them to keep this project running.')
		await expect(notice).toContainText('An invoice overdue for 6 months will pause this project.')
		await expect(main.getByRole('status')).toHaveCount(0)
	})

	test('says the project will be paused once an invoice is 6 months overdue', async ({ page }) => {
		await setMocks({
			'billing.listInvoices': {
				ok: true,
				result: { items: [invoiceItem({ id: 'inv-old', status: 'open', monthsAgo: 7 })] }
			}
		})
		await page.goto('/?project=test-project')
		const notice = page.locator('.content-wrapper').getByRole('status')
		await expect(notice).toContainText('1 invoice is overdue')
		await expect(notice).toContainText('An invoice has been overdue for 6 months and will pause this project.')
	})

	test('stays quiet when invoices are paid or cannot be loaded', async ({ page }) => {
		await setMocks({
			'billing.listInvoices': {
				ok: true,
				result: { items: [invoiceItem({ id: 'inv-paid', status: 'paid', monthsAgo: 8 })] }
			}
		})
		await page.goto('/?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
		await expect(main.getByRole('status')).toHaveCount(0)
		await expect(main.getByRole('alert')).toHaveCount(0)

		await setMocks({
			'billing.listInvoices': { ok: false, error: { message: 'api: billing account not found' } }
		})
		await page.goto('/?project=test-project')
		await expect(main.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
		await expect(main.getByRole('status')).toHaveCount(0)
		await expect(main.getByRole('alert')).toHaveCount(0)
	})
})
