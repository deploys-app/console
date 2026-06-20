import { test, expect, setMocks } from './helpers.js'
import { sampleServiceAccount } from './fixtures/mocks.js'

test.describe('service accounts', () => {
	test('lists service accounts', async ({ page }) => {
		await setMocks({
			'serviceAccount.list': {
				ok: true,
				result: { items: [sampleServiceAccount] }
			}
		})

		await page.goto('/service-account?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Service Accounts' })).toBeVisible()
		await expect(main.getByRole('link', { name: '[email protected]' })).toBeVisible()
		await expect(main.getByText('CI bot')).toBeVisible()
	})

	test('empty state when no service accounts', async ({ page }) => {
		await page.goto('/service-account?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'serviceAccount.list': {
				ok: false,
				error: { message: 'api: internal error' }
			}
		})

		await page.goto('/service-account?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()
		await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible()
	})

	test('Try again recovers the list after a transient error', async ({ page }) => {
		await setMocks({
			'serviceAccount.list': { ok: false, error: { message: 'api: internal error' } }
		})

		await page.goto('/service-account?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()

		// Upstream recovers; clicking Try again re-runs load() in place.
		await setMocks({
			'serviceAccount.list': { ok: true, result: { items: [sampleServiceAccount] } }
		})
		await main.getByRole('button', { name: 'Try again' }).click()

		await expect(main.getByRole('link', { name: '[email protected]' })).toBeVisible()
		await expect(main.getByText(/Something went wrong while loading this data/)).toHaveCount(0)
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'serviceAccount.list': {
				ok: false,
				error: { message: 'iam: forbidden' }
			}
		})

		await page.goto('/service-account?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})

	test('gates the create button when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['serviceaccount.list'], admin: false } }
		})

		await page.goto('/service-account?project=test-project')
		const main = page.locator('.content-wrapper')
		// Denied → GuardedButton renders a disabled <button>, never the <a> link.
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create' })).toHaveCount(0)
	})
})

test.describe('service account — create', () => {
	test('shows the API error in a modal when create fails', async ({ page }) => {
		await setMocks({
			'serviceAccount.create': {
				ok: false,
				error: { message: 'api: service account already exists' }
			}
		})

		await page.goto('/service-account/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-sid').fill('ci-bot')
		await main.locator('#input-name').fill('CI bot')
		await main.getByRole('button', { name: 'Save' }).click()

		// modal.error surfaces resp.error via SweetAlert.
		await expect(page.locator('.swal2-popup')).toBeVisible()
		await expect(page.locator('.swal2-html-container')).toContainText('api: service account already exists')
	})

	test('renders validate-error items in the modal', async ({ page }) => {
		await setMocks({
			'serviceAccount.create': {
				ok: false,
				error: {
					message: 'api: validate error',
					items: ['name is required', 'id is invalid']
				}
			}
		})

		await page.goto('/service-account/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-sid').fill('bad id')
		await main.locator('#input-name').fill('x')
		await main.getByRole('button', { name: 'Save' }).click()

		const dialog = page.locator('.swal2-html-container')
		await expect(dialog).toContainText('name is required')
		await expect(dialog).toContainText('id is invalid')
	})

	test('disables Save when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['serviceaccount.list'], admin: false } }
		})

		await page.goto('/service-account/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Save' })).toBeDisabled()
	})
})
