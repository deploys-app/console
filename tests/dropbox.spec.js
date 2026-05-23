import { test, expect, setMocks } from './helpers.js'
import { sampleDropboxItem } from './fixtures/mocks.js'

test.describe('dropbox', () => {
	test('shows empty state when no files', async ({ page }) => {
		await page.goto('/dropbox?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Dropbox' })).toBeVisible()
		await expect(main.getByText(/No files yet/)).toBeVisible()
	})

	test('renders uploaded files from dropbox.list', async ({ page }) => {
		await setMocks({
			'dropbox.list': {
				ok: true,
				result: { items: [sampleDropboxItem] }
			}
		})

		await page.goto('/dropbox?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('report.pdf')).toBeVisible()
		await expect(main.getByText(sampleDropboxItem.downloadUrl)).toBeVisible()
		// size formatter prints KB for 2048 bytes.
		await expect(main.getByText(/2\.0 KB/)).toBeVisible()
		// the open link points at the download URL.
		await expect(main.getByRole('link', { name: 'Open URL' }))
			.toHaveAttribute('href', sampleDropboxItem.downloadUrl)
	})

	test('falls back to (no name) when filename is empty', async ({ page }) => {
		await setMocks({
			'dropbox.list': {
				ok: true,
				result: {
					items: [{ ...sampleDropboxItem, filename: '' }]
				}
			}
		})

		await page.goto('/dropbox?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('(no name)')).toBeVisible()
	})

	test('surfaces a load error', async ({ page }) => {
		await setMocks({
			'dropbox.list': {
				ok: false,
				error: { message: 'iam: forbidden' }
			}
		})

		await page.goto('/dropbox?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('iam: forbidden')).toBeVisible()
	})
})
