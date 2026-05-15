import { test, expect, setMocks } from './helpers.js'
import { sampleWorkloadIdentity } from './fixtures/mocks.js'

test.describe('workload identities', () => {
	test('lists workload identities', async ({ page }) => {
		await setMocks({
			'workloadIdentity.list': {
				ok: true,
				result: { items: [sampleWorkloadIdentity] }
			}
		})

		await page.goto('/workload-identity?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Workload Identities' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'gsa-binding' })).toBeVisible()
	})

	test('empty state when no workload identities', async ({ page }) => {
		await page.goto('/workload-identity?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No data')).toBeVisible()
	})
})
