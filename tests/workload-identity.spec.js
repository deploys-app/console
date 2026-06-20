import { test, expect, setMocks, pickSelect } from './helpers.js'
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
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'workloadIdentity.list': { ok: false, error: { message: 'api: internal error' } }
		})
		await page.goto('/workload-identity?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('api: internal error')).toBeVisible()
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'workloadIdentity.list': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/workload-identity?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})

	test('gates the create button when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['workloadidentity.list'], admin: false } }
		})
		await page.goto('/workload-identity?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create' })).toHaveCount(0)
	})
})

test.describe('workload identity — create', () => {
	test('shows the API error in a modal when create fails', async ({ page }) => {
		await setMocks({
			'workloadIdentity.create': { ok: false, error: { message: 'api: workload identity already exists' } }
		})

		await page.goto('/workload-identity/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('gsa-binding')
		await pickSelect(page, 'input-location', 'gke')
		await main.locator('#input-gsa').fill('[email protected]')
		await main.getByRole('button', { name: 'Create' }).click()

		await expect(page.locator('.swal2-popup')).toBeVisible()
		await expect(page.locator('.swal2-html-container')).toContainText('api: workload identity already exists')
	})

	test('disables Create when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['workloadidentity.list'], admin: false } }
		})
		await page.goto('/workload-identity/create?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
	})
})
