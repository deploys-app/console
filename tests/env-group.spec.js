import { test, expect, setMocks } from './helpers.js'
import { sampleEnvGroup } from './fixtures/mocks.js'

test.describe('env groups', () => {
	test('lists env groups', async ({ page }) => {
		await setMocks({
			'envGroup.list': {
				ok: true,
				result: { items: [sampleEnvGroup] }
			}
		})

		await page.goto('/env-group?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'shared-config' })).toBeVisible()
		await expect(main.getByRole('cell', { name: '2', exact: true })).toBeVisible()
	})

	test('empty state when no env groups', async ({ page }) => {
		await page.goto('/env-group?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'envGroup.list': { ok: false, error: { message: 'api: internal error' } }
		})
		await page.goto('/env-group?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()
		await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible()
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'envGroup.list': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/env-group?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})

	test('gates the create button when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['envgroup.list'], admin: false } }
		})
		await page.goto('/env-group?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create' })).toHaveCount(0)
	})

	test('shows the API error in a modal when create fails', async ({ page }) => {
		await setMocks({
			'envgroup.create': { ok: false, error: { message: 'api: env group already exists' } }
		})

		await page.goto('/env-group/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('shared-config')
		await main.getByRole('button', { name: 'Create', exact: true }).click()

		await expect(page.locator('.swal2-popup')).toBeVisible()
		await expect(page.locator('.swal2-html-container')).toContainText('api: env group already exists')
	})

	test('shows existing env vars on update', async ({ page }) => {
		await setMocks({
			'envGroup.get': {
				ok: true,
				result: sampleEnvGroup
			}
		})

		await page.goto('/env-group/create?project=test-project&name=shared-config')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Edit env group' })).toBeVisible()
		await expect(main.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('shared-config')
		await expect(main.locator('input[placeholder="Variable name"]').nth(0)).toHaveValue('LOG_LEVEL')
		await expect(main.locator('input[placeholder="Value"]').nth(0)).toHaveValue('info')
		await expect(main.getByRole('button', { name: 'Update', exact: true })).toBeVisible()
		await expect(main.getByRole('button', { name: 'Update and redeploy' })).toBeVisible()
		// Deletion now lives on the env-group detail page, not the edit form.
		await expect(main.getByRole('button', { name: 'Delete' })).toHaveCount(0)
		await expect(main.getByRole('link', { name: 'shared-config' })).toHaveAttribute('href', /\/env-group\/detail\?/)
	})
})
