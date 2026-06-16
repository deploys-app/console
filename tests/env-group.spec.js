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
