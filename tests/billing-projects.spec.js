import { test, expect, setMocks } from './helpers.js'
import { sampleBillingAccount } from './fixtures/mocks.js'

const ownerAccount = { ...sampleBillingAccount, role: 'owner' }
const accountantAccount = { ...sampleBillingAccount, role: 'accountant' }

const boundProjects = {
	ok: true,
	result: {
		items: [
			{ id: '1', project: 'test-project', name: 'Test Project', createdAt: '2024-01-01T00:00:00Z' },
			{ id: '2', project: 'other-project', name: 'Other Project', createdAt: '2024-02-01T00:00:00Z' }
		]
	}
}

test.describe('billing account projects', () => {
	test('lists every project bound to the account and links the ones the caller can open', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: ownerAccount },
			'billing.listProjects': boundProjects
		})

		await page.goto('/billing/projects?id=ba-1')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'Projects' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Test Project' })).toHaveAttribute('href', '/?project=test-project')
		await expect(main.getByText('other-project')).toBeVisible()
		await expect(main.getByRole('link', { name: 'Other Project' })).toHaveCount(0)
		await expect(main.getByRole('link', { name: 'New project' })).toHaveAttribute('href', '/project/create?billingAccount=ba-1')

		await main.getByRole('link', { name: 'Test Project' }).click()
		await expect(page).toHaveURL(/\/\?project=test-project/)
	})

	test('shows an empty state when nothing is bound', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: ownerAccount },
			'billing.listProjects': { ok: true, result: { items: [] } }
		})

		await page.goto('/billing/projects?id=ba-1')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No projects are billed to this account.')).toBeVisible()
		await expect(main.getByRole('link', { name: 'New project' })).toHaveAttribute('href', '/project/create?billingAccount=ba-1')
	})

	test('an accountant sees the projects but not New project', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: accountantAccount },
			'billing.listProjects': boundProjects
		})

		await page.goto('/billing/detail?id=ba-1')

		const main = page.locator('.content-wrapper')
		const projectsTab = main.locator('a.portal-tab', { hasText: 'Projects' })
		await expect(projectsTab).toHaveAttribute('href', '/billing/projects?id=ba-1')
		await expect(main.getByRole('link', { name: 'Members' })).toHaveCount(0)
		await expect(main.locator('a.quick', { hasText: 'Projects' })).toHaveAttribute('href', '/billing/projects?id=ba-1')

		await page.goto('/billing/projects?id=ba-1')
		await expect(main.getByText('Test Project')).toBeVisible()
		await expect(main.getByText('Other Project')).toBeVisible()
		await expect(main.getByRole('link', { name: 'New project' })).toHaveCount(0)
	})

	test('new project from this account pre-selects it on the create form', async ({ page }) => {
		await setMocks({
			'billing.list': { ok: true, result: { items: [ownerAccount] } }
		})

		await page.goto('/project/create?billingAccount=ba-1')

		await expect(page.getByRole('combobox', { name: 'Billing Account' })).toHaveText('Personal (ba-1)')
	})
})
