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

		// manifest / tag counts and size are shown per repository
		await expect(main.getByRole('columnheader', { name: 'Manifests' })).toBeVisible()
		await expect(main.getByRole('columnheader', { name: 'Tags' })).toBeVisible()
		await expect(main.getByRole('columnheader', { name: 'Size' })).toBeVisible()
		const webRow = main.getByRole('row').filter({ has: page.getByRole('link', { name: 'web', exact: true }) })
		await expect(webRow.getByRole('cell', { name: '4', exact: true })).toBeVisible()
		await expect(webRow.getByRole('cell', { name: '6', exact: true })).toBeVisible()
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
