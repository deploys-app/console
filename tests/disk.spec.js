import { test, expect, setMocks, pickSelect } from './helpers.js'
import { sampleDisk } from './fixtures/mocks.js'

test.describe('disks', () => {
	test('lists disks', async ({ page }) => {
		await setMocks({
			'disk.list': {
				ok: true,
				result: {
					items: [
						sampleDisk,
						{ ...sampleDisk, name: 'cache', size: 5 }
					]
				}
			}
		})

		await page.goto('/disk?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Disks' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'data' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'cache' })).toBeVisible()
		await expect(main.getByText('10 GiB')).toBeVisible()
		await expect(main.getByText('5 GiB')).toBeVisible()
	})

	test('empty state when no disks', async ({ page }) => {
		await page.goto('/disk?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'disk.list': { ok: false, error: { message: 'api: internal error' } }
		})
		await page.goto('/disk?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()
		await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible()
	})

	test('shows a permission message when the list is forbidden', async ({ page }) => {
		await setMocks({
			'disk.list': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/disk?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText("You don't have permission to view data")).toBeVisible()
	})

	test('gates the create button when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['disk.list'], admin: false } }
		})
		await page.goto('/disk?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create' })).toHaveCount(0)
	})
})

test.describe('disk — create', () => {
	test('shows the API error in a modal when create fails', async ({ page }) => {
		await setMocks({
			'disk.create': { ok: false, error: { message: 'api: disk already exists' } }
		})

		await page.goto('/disk/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('data')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'Create' }).click()

		await expect(page.locator('.swal2-popup')).toBeVisible()
		await expect(page.locator('.swal2-html-container')).toContainText('api: disk already exists')
	})

	test('disables Create when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['disk.list'], admin: false } }
		})
		await page.goto('/disk/create?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create' })).toBeDisabled()
	})
})
