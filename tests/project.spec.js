import { test, expect, setMocks, getRequestLog } from './helpers.js'
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
		await expect(main.locator('.project-open')).toHaveCount(2)
	})

	test('shows the no-data row when there are no projects', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [] } }
		})

		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Projects' })).toBeVisible()
		await expect(main.getByText('No projects yet')).toBeVisible()
	})

	test('exposes the create-project link', async ({ page }) => {
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'New project' }).first()).toHaveAttribute('href', '/project/create')
	})

	test('opens the project search modal with the "/" shortcut', async ({ page }) => {
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
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		// Clicking the search button opens the modal (and confirms the page has
		// hydrated, so the global "/" listener is attached before we press it).
		await main.getByRole('button', { name: /Search projects/ }).click()
		await expect(page.locator('.modal.is-active')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		// The "/" shortcut opens the same search modal.
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		const search = dialog.getByPlaceholder(/Search projects/)
		await expect(search).toBeFocused()

		// Typing filters the list.
		await search.fill('another')
		await expect(dialog.getByRole('link', { name: 'Another' })).toBeVisible()
		await expect(dialog.getByRole('link', { name: 'Test Project' })).toHaveCount(0)

		// Escape closes it.
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})
})

test.describe('project delete (type-to-confirm)', () => {
	test('the Delete prompt stays gated until the exact project id is typed', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [defaultProject] } },
			'project.delete': { ok: true, result: true }
		})
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Remove' }).click()

		const dialog = page.locator('#app-modal')
		const confirm = page.locator('#app-modal-confirm')
		const input = page.locator('#app-modal-input')
		await expect(dialog).toBeVisible()
		// Delete is disabled until the typed name matches the project id exactly.
		await expect(confirm).toBeDisabled()

		await input.fill('wrong-name')
		await expect(confirm).toBeDisabled()
		// Enter on a non-match must neither close nor delete.
		await input.press('Enter')
		await expect(dialog).toBeVisible()
		expect((await getRequestLog()).some((r) => r.path === '/project.delete')).toBe(false)

		await input.fill('test-project')
		await expect(confirm).toBeEnabled()
		await confirm.click()

		await expect.poll(async () =>
			(await getRequestLog()).some((r) => r.path === '/project.delete')
		).toBe(true)
	})

	test('Cancel dismisses the Delete prompt without deleting', async ({ page }) => {
		await setMocks({
			'project.list': { ok: true, result: { items: [defaultProject] } },
			'project.delete': { ok: true, result: true }
		})
		await page.goto('/project')
		const main = page.locator('.content-wrapper')
		await main.getByRole('button', { name: 'Remove' }).click()
		await expect(page.locator('#app-modal')).toBeVisible()

		await page.getByRole('button', { name: 'Cancel' }).click()
		await expect(page.locator('#app-modal')).toBeHidden()
		expect((await getRequestLog()).some((r) => r.path === '/project.delete')).toBe(false)
	})
})

test.describe('project dashboard', () => {
	test('renders when a project is selected', async ({ page }) => {
		await page.goto('/?project=test-project')
		await expect(page).toHaveURL(/\?project=test-project/)
	})
})
