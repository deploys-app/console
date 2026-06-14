import { test, expect, setMocks } from './helpers.js'
import { sampleRole } from './fixtures/mocks.js'

test.describe('roles', () => {
	test('lists roles', async ({ page }) => {
		await setMocks({
			'role.list': {
				ok: true,
				result: { items: [sampleRole] }
			}
		})

		await page.goto('/role?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Roles' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'developer' })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'Developer', exact: true })).toBeVisible()
	})

	test('empty state when no roles', async ({ page }) => {
		await page.goto('/role?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('searchable permission picker filters, adds, and resets', async ({ page }) => {
		await setMocks({
			'role.permissions': {
				ok: true,
				result: [
					'project.get', 'project.update',
					'deployment.list', 'deployment.get', 'deployment.deploy',
					'domain.list', 'domain.create'
				]
			}
		})

		await page.goto('/role/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Create role' })).toBeVisible()

		// Fill the required fields so the form could submit — lets us prove the
		// picker's Enter handling, not native validation, is what holds it back.
		await page.fill('#input-role', 'auditor')
		await page.fill('#input-name', 'Auditor')

		const picker = page.locator('#input-permission')
		const listbox = page.locator('#input-permission-listbox')

		// Opening shows the full list.
		await picker.click()
		await expect(listbox.getByRole('option', { name: 'deployment.list', exact: true })).toBeVisible()
		await expect(listbox.getByRole('option', { name: 'domain.create', exact: true })).toBeVisible()

		// Typing filters the list down to matches.
		await picker.fill('domain')
		await expect(listbox.getByRole('option', { name: 'domain.create', exact: true })).toBeVisible()
		await expect(listbox.getByRole('option', { name: 'deployment.list', exact: true })).toHaveCount(0)

		// A query that matches nothing shows the empty state, and Enter on it must
		// not submit the surrounding form (stays on the create page).
		await picker.fill('nope')
		await expect(listbox.getByText('No matching permission')).toBeVisible()
		await picker.press('Enter')
		await expect(main.getByRole('heading', { name: 'Create role' })).toBeVisible()

		// Picking adds it to the table, clears the field, and drops it from the list.
		await picker.fill('domain.create')
		await listbox.getByRole('option', { name: 'domain.create', exact: true }).click()
		await expect(main.getByRole('cell', { name: 'domain.create', exact: true })).toBeVisible()
		await expect(picker).toHaveValue('')

		await picker.fill('domain')
		await expect(listbox.getByRole('option', { name: 'domain.create', exact: true })).toHaveCount(0)
		await expect(listbox.getByRole('option', { name: 'domain.list', exact: true })).toBeVisible()
	})
})
