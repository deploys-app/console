import { test, expect, setMocks } from './helpers.js'
import { sampleDeployment } from './fixtures/mocks.js'

test.describe('deployments', () => {
	test('lists deployments', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: true,
				result: {
					items: [
						sampleDeployment,
						{ ...sampleDeployment, name: 'api', type: 'TCPService' }
					]
				}
			}
		})

		await page.goto('/deployment?project=test-project')

		await expect(page.getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'api' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Create' })).toHaveAttribute(
			'href',
			'/deployment/deploy?project=test-project'
		)
	})

	test('shows empty state when there are no deployments', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})

	test('shows error row when the deployment.list API fails', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: false,
				error: { message: 'api: internal error' }
			}
		})
		await page.goto('/deployment?project=test-project')
		await expect(page.getByText(/api: internal error/)).toBeVisible()
	})
})
