import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { defaultLocation, defaultProject, sampleDeployment, sampleStaticDeployment } from './fixtures/mocks.js'

test.describe('global search palette', () => {
	test('"/" opens the palette on a project page and shows the nav sections', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		// The global palette — not the project picker.
		await expect(dialog.getByPlaceholder(/Search projects, deployments/)).toBeFocused()
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

		await dialog.getByPlaceholder(/Search projects, deployments/).fill('web')
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
		await expect(page.locator('.modal.is-active').getByPlaceholder(/Search projects, deployments/)).toHaveCount(0)
	})

	test('"Switch project" command opens a project sub-mode where typing then Enter switches', async ({ page }) => {
		const otherProject = { ...defaultProject, id: '2', project: 'staging', name: 'Staging' }
		await setMocks({
			'project.list': { ok: true, result: { items: [defaultProject, otherProject] } }
		})

		await page.goto('/deployment?project=test-project')
		// Wait for hydration before the "/" shortcut is wired up.
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()

		// Typing "project" surfaces the single "Switch project" command rather than
		// a flat list of every project.
		await dialog.getByPlaceholder(/Search projects, deployments/).fill('project')
		const command = dialog.locator('.result').filter({ hasText: 'Switch project' }).first()
		await expect(command).toBeVisible()

		// Enter opens the project sub-mode: the heading and placeholder change and
		// the input is refocused so the next keystrokes filter projects.
		await page.keyboard.press('Enter')
		await expect(dialog.getByRole('heading', { name: 'Switch project' })).toBeVisible()
		const projectInput = dialog.getByPlaceholder(/Switch to project/)
		await expect(projectInput).toBeFocused()

		await projectInput.fill('staging')
		const switchRow = dialog.locator('.result').filter({ hasText: 'Staging' }).first()
		await expect(switchRow).toBeVisible()
		// Current project should NOT appear (filtered out at source).
		await expect(dialog.locator('.result').filter({ hasText: 'Test Project' })).toHaveCount(0)

		await switchRow.click()
		await expect(page).toHaveURL(/[?&]project=staging\b/)
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})

	test('Escape steps back out of the project sub-mode before closing the palette', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		// Wait for hydration before the "/" shortcut is wired up.
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()

		await dialog.getByPlaceholder(/Search projects, deployments/).fill('project')
		await page.keyboard.press('Enter')
		await expect(dialog.getByPlaceholder(/Switch to project/)).toBeFocused()

		// First Escape returns to the main search palette (does not close).
		await page.keyboard.press('Escape')
		await expect(dialog).toBeVisible()
		await expect(dialog.getByPlaceholder(/Search projects, deployments/)).toBeFocused()

		// Second Escape closes the palette.
		await page.keyboard.press('Escape')
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
	})

	test('navbar search trigger is hidden when no project is selected', async ({ page }) => {
		await page.goto('/project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Projects' })).toBeVisible()
		// The trigger lives in the navbar (outside `.content-wrapper`), so a
		// global "Search" button query should turn up nothing here.
		await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveCount(0)
	})
})

test.describe('global search palette — page actions', () => {
	// Navigate to a deployment detail page (Header mounts, registering its actions)
	// and open the palette. Returns the open dialog locator.
	async function openPaletteOnDeployment (page, deployment = sampleDeployment) {
		await setMocks({
			'deployment.get': { ok: true, result: deployment },
			'location.get': { ok: true, result: defaultLocation }
		})
		await page.goto('/deployment/metrics?project=test-project&location=gke&name=web')
		// Wait for the masthead (Header) to render — that is what registers the
		// page actions, and confirms the page has hydrated for the "/" shortcut.
		await expect(page.locator('.masthead').getByRole('heading', { name: 'web' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		return dialog
	}

	test('a live deployment surfaces its masthead actions and never the dangerous ones', async ({ page }) => {
		const dialog = await openPaletteOnDeployment(page)

		// The "This page" group leads the empty-query palette.
		await expect(dialog.getByText('This page', { exact: false })).toBeVisible()
		await expect(dialog.getByRole('link', { name: 'Deploy new revision' })).toBeVisible()
		await expect(dialog.locator('.result').filter({ hasText: 'Pause' })).toBeVisible()
		await expect(dialog.locator('.result').filter({ hasText: 'Restart' })).toBeVisible()
		// Resume only shows for a paused deployment.
		await expect(dialog.locator('.result').filter({ hasText: 'Resume' })).toHaveCount(0)
		// Dangerous actions are never offered anywhere in the palette.
		await expect(dialog.locator('.result').filter({ hasText: 'Delete' })).toHaveCount(0)
		await expect(dialog.locator('.result').filter({ hasText: 'Rollback' })).toHaveCount(0)
	})

	test('a paused deployment offers Resume, not Pause', async ({ page }) => {
		const dialog = await openPaletteOnDeployment(page, { ...sampleDeployment, action: 'pause' })

		await expect(dialog.locator('.result').filter({ hasText: 'Resume' })).toBeVisible()
		await expect(dialog.locator('.result').filter({ hasText: 'Pause' })).toHaveCount(0)
		// Restart is gated on the same condition as Pause, so it is absent too.
		await expect(dialog.locator('.result').filter({ hasText: 'Restart' })).toHaveCount(0)
		// Deploy new revision remains available.
		await expect(dialog.getByRole('link', { name: 'Deploy new revision' })).toBeVisible()
	})

	test('selecting Pause closes the palette and opens the confirm dialog, which fires deployment.pause', async ({ page }) => {
		const dialog = await openPaletteOnDeployment(page)

		await dialog.locator('.result').filter({ hasText: 'Pause' }).click()
		// The palette closes and the shared confirm <dialog> takes over.
		await expect(page.locator('.modal.is-active')).toHaveCount(0)
		const confirm = page.locator('dialog[open]')
		await expect(confirm).toBeVisible()
		await expect(confirm.getByText('Pause web in gke?')).toBeVisible()

		await confirm.getByRole('button', { name: 'Pause' }).click()

		// The confirm callback invokes deployment.pause through the /api proxy.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path.includes('deployment.pause'))
		}).toBe(true)
	})

	test('page actions are filterable', async ({ page }) => {
		const dialog = await openPaletteOnDeployment(page)

		await dialog.getByPlaceholder(/Search projects, deployments/).fill('pau')
		await expect(dialog.locator('.result').filter({ hasText: 'Pause' })).toBeVisible()
		// A nav entry that doesn't match "pau" is filtered out.
		await expect(dialog.getByRole('link', { name: 'Deployments' })).toHaveCount(0)
	})

	test('the "reboot" keyword matches Restart', async ({ page }) => {
		const dialog = await openPaletteOnDeployment(page)

		await dialog.getByPlaceholder(/Search projects, deployments/).fill('reboot')
		await expect(dialog.locator('.result').filter({ hasText: 'Restart' })).toBeVisible()
	})

	test('a static deployment contributes no page actions', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})
		await page.goto('/deployment/metrics?project=test-project&location=gke&name=website')
		await expect(page.locator('.masthead').getByRole('heading', { name: 'website' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText('This page', { exact: false })).toHaveCount(0)
	})

	test('no page-action group on a non-deployment-detail page', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		// The deployment LIST page mounts no Header, so no page actions register.
		await expect(dialog.getByText('This page', { exact: false })).toHaveCount(0)
	})

	test('a user without deployment.deploy sees no page actions', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['deployment.get', 'deployment.list'], admin: false } },
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})
		await page.goto('/deployment/metrics?project=test-project&location=gke&name=web')
		await expect(page.locator('.masthead').getByRole('heading', { name: 'web' })).toBeVisible()
		await page.keyboard.press('/')
		const dialog = page.locator('.modal.is-active')
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText('This page', { exact: false })).toHaveCount(0)
	})
})
