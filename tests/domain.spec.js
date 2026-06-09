import { test, expect, setMocks } from './helpers.js'
import { sampleDomain } from './fixtures/mocks.js'

test.describe('domains', () => {
	test('lists domains', async ({ page }) => {
		await setMocks({
			'domain.list': {
				ok: true,
				result: {
					items: [
						sampleDomain,
						{ ...sampleDomain, domain: 'foo.example.com', wildcard: true, cdn: false }
					]
				}
			}
		})

		await page.goto('/domain?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Domains' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'example.com', exact: true })).toBeVisible()
		await expect(main.getByRole('link', { name: 'foo.example.com', exact: true })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Create' })).toHaveAttribute(
			'href',
			'/domain/create?project=test-project'
		)
	})

	test('empty state when no domains', async ({ page }) => {
		await page.goto('/domain?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('delete blocked by routes lists the blocking routes', async ({ page }) => {
		await setMocks({
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'domain.delete': {
				ok: false,
				error: {
					message: 'api: domain in used by route(s): api.example.com/, example.com/admin (+2 more)'
				}
			}
		})

		await page.goto('/domain?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Remove' }).first().click()

		// Confirm dialog → Delete triggers the (mocked) failing delete.
		await page.getByRole('button', { name: 'Delete' }).click()

		// The error modal turns the raw "domain in used by route(s): …" message
		// into a readable list with a next step.
		const dialog = page.locator('.swal2-popup')
		await expect(dialog.getByText('Delete them first:')).toBeVisible()
		await expect(dialog.getByText('api.example.com/')).toBeVisible()
		await expect(dialog.getByText('example.com/admin')).toBeVisible()
		await expect(dialog.getByText('and 2 more')).toBeVisible()
	})
})
