import { test, expect, setMocks } from './helpers.js'
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
})
