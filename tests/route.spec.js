import { test, expect, setMocks } from './helpers.js'
import { sampleRoute } from './fixtures/mocks.js'

test.describe('routes', () => {
	test('lists routes', async ({ page }) => {
		await setMocks({
			'route.list': {
				ok: true,
				result: {
					items: [
						sampleRoute,
						{ ...sampleRoute, domain: 'api.example.com', path: '/v1', target: 'api' }
					]
				}
			}
		})

		await page.goto('/route?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Routes' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'https://example.com/' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'https://api.example.com/v1' })).toBeVisible()
		await expect(main.locator('table tbody tr')).toHaveCount(2)
	})

	test('empty state when no routes', async ({ page }) => {
		await page.goto('/route?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No data')).toBeVisible()
	})
})
