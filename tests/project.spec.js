import { test, expect, setMocks } from './helpers.js'
import { defaultProject } from './fixtures/mocks.js'

test.describe('project list', () => {
	test('lists projects returned from the API', async ({ page }) => {
		await setMocks({
			'project.list': {
				ok: true,
				result: {
					items: [
						defaultProject,
						{ ...defaultProject, id: '2', project: 'another', name: 'Another' }
					]
				}
			}
		})

		await page.goto('/project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Test Project' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Another' })).toBeVisible()
		await expect(main.locator('table tbody tr')).toHaveCount(2)
	})

	test('shows the no-data row when there are no projects', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [] } }
		})

		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(main.getByText('No data')).toBeVisible()
	})

	test('exposes the create-project link', async ({ page }) => {
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/project/create')
	})
})

test.describe('project dashboard', () => {
	test('renders when a project is selected', async ({ page }) => {
		await page.goto('/?project=test-project')
		await expect(page).toHaveURL(/\?project=test-project/)
	})
})
