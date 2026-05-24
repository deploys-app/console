import { test, expect, setMocks } from './helpers.js'
import { sampleRepository } from './fixtures/mocks.js'

test.describe('registry', () => {
	test('lists repositories', async ({ page }) => {
		await setMocks({
			'__registry/list': {
				ok: true,
				result: { items: [sampleRepository, { ...sampleRepository, name: 'api' }] }
			},
			'__registry/getProjectStorage': {
				ok: true,
				result: { size: 99999 }
			}
		})

		await page.goto('/registry?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Registry' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api' })).toBeVisible()
	})

	test('shows total storage from getProjectStorage', async ({ page }) => {
		await setMocks({
			'__registry/getProjectStorage': {
				ok: true,
				result: { size: 1024 * 1024 * 10 } // 10 MiB
			}
		})

		await page.goto('/registry?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Total Storage:/)).toBeVisible()
	})

	test('empty state when no repositories', async ({ page }) => {
		await page.goto('/registry?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('shows error row when registry list fails', async ({ page }) => {
		await setMocks({
			'__registry/list': {
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
