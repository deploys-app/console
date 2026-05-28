import { test, expect, setMocks } from './helpers.js'
import { sampleDeployment } from './fixtures/mocks.js'

test.describe('global search palette', () => {
	test('"/" opens the palette on a project page and shows the nav sections', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		// The global palette — not the project picker.
		await expect(dialog.getByPlaceholder(/Search deployments, domains/)).toBeFocused()
		// Empty query → "Go to" nav sections only.
		await expect(dialog.getByText('Go to', { exact: false })).toBeVisible()
		await expect(dialog.getByRole('link', { name: 'Deployments' })).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})

	test('typing surfaces fetched resources; clicking navigates to the detail route', async ({ page }) => {
		await setMocks({
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } },
			// The destination route's loader needs deployment.get to succeed,
			// otherwise SvelteKit cancels the navigation and the URL won't change.
			'deployment.get': { ok: true, result: sampleDeployment }
		})

		await page.goto('/deployment?project=test-project')
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()

		await dialog.getByPlaceholder(/Search deployments, domains/).fill('web')
		// The resource row from deployment.list, with its location as sublabel.
		const webRow = dialog.getByRole('link', { name: /web/ }).first()
		await expect(webRow).toBeVisible()
		await expect(dialog.getByText('gke', { exact: false })).toBeVisible()

		await webRow.click()
		await expect(page).toHaveURL(/\/deployment\/metrics\?project=test-project&location=gke&name=web/)
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})

	test('"/" is ignored while typing in a text field', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		// Inject a focused text field so the global "/" handler sees a typing target.
		await page.evaluate(() => {
			const i = document.createElement('input')
			i.id = '__probe'; i.type = 'text'
			document.body.appendChild(i); i.focus()
		})
		await page.keyboard.press('/')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
		await expect(page.locator('#__probe')).toHaveValue('/')
	})

	test('does not open the global palette on /project (project picker owns "/")', async ({ page }) => {
		await page.goto('/project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Projects' })).toBeVisible()

		// Page must have hydrated before we press "/", so click the trigger first.
		await page.locator('.content-wrapper').getByRole('button', { name: /Search projects/ }).click()
		await expect(page.locator('.modal.is-active')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		await page.keyboard.press('/')
		// Exactly one modal opens — the project picker — not also the global palette.
		await expect(page.locator('.modal.is-active')).toHaveCount(1)
		await expect(page.locator('.modal.is-active').getByPlaceholder(/Search projects/)).toBeFocused()
		// The global palette's placeholder must not appear in any open modal
		// (its element is always in the DOM, just hidden via `.is-active`).
		await expect(page.locator('.modal.is-active').getByPlaceholder(/Search deployments, domains/)).toHaveCount(0)
	})

	test('navbar search trigger is hidden when no project is selected', async ({ page }) => {
		await page.goto('/project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Projects' })).toBeVisible()
		// The trigger lives in the navbar (outside `.content-wrapper`), so a
		// global "Search" button query should turn up nothing here.
		await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveCount(0)
	})
})
