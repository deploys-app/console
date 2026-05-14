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

		await expect(page.getByRole('heading', { name: 'Disks' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'data' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'cache' })).toBeVisible()
		await expect(page.getByText('10 GiB')).toBeVisible()
		await expect(page.getByText('5 GiB')).toBeVisible()
	})

	test('empty state when no disks', async ({ page }) => {
		await page.goto('/disk?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
