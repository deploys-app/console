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

		await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible()
		await expect(page.getByText('developer')).toBeVisible()
		await expect(page.getByText('Developer')).toBeVisible()
	})

	test('empty state when no roles', async ({ page }) => {
		await page.goto('/role?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
