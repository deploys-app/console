import { test, expect, setMocks } from './helpers.js'
import { sampleRepository } from './fixtures/mocks.js'

test.describe('registry', () => {
	test('lists repositories', async ({ page }) => {
		await setMocks({
			'registry/list': {
				ok: true,
				result: { items: [sampleRepository, { ...sampleRepository, name: 'api' }] }
			},
			'registry/getProjectStorage': {
				ok: true,
				result: { size: 99999 }
			}
		})

		await page.goto('/registry?project=test-project')

		await expect(page.getByRole('heading', { name: 'Registry' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'api' })).toBeVisible()
	})

	test('empty state when no repositories', async ({ page }) => {
		await page.goto('/registry?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
