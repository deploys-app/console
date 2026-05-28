import { test, expect, setMocks } from './helpers.js'
import { sampleRepository } from './fixtures/mocks.js'

test.describe('registry', () => {
	test('lists repositories', async ({ page }) => {
		await setMocks({
			'registry.list': {
				ok: true,
				result: { items: [sampleRepository, { ...sampleRepository, name: 'api' }] }
			}
		})

		await page.goto('/registry?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Registry' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api' })).toBeVisible()
	})

	test('empty state when no repositories', async ({ page }) => {
		await page.goto('/registry?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('shows error row when registry list fails', async ({ page }) => {
		await setMocks({
			'registry.list': {
				ok: false,
				error: { message: 'api: forbidden' }
			}
		})
		await page.goto('/registry?project=test-project')
		const main = page.locator('.content-wrapper')
		// api: forbidden flips to a permission message via api.invoke
		await expect(main.getByText(/don't have permission/i)).toBeVisible()
	})
})
