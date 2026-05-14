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

		await expect(page.getByRole('heading', { name: 'Domains' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'example.com', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'foo.example.com', exact: true })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Create' })).toHaveAttribute(
			'href',
			'/domain/create?project=test-project'
		)
	})

	test('empty state when no domains', async ({ page }) => {
		await page.goto('/domain?project=test-project')
		await expect(page.getByText(/no data/i)).toBeVisible()
	})
})
