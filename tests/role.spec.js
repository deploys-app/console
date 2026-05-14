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
		await expect(main.getByText('developer')).toBeVisible()
		await expect(main.getByText('Developer')).toBeVisible()
	})

	test('empty state when no roles', async ({ page }) => {
		await page.goto('/role?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No data')).toBeVisible()
	})
})
