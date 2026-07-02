import { test, expect } from './helpers.js'

test.describe('view transitions', () => {
	test('page changes start a view transition; unsupported browsers unaffected', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()

		// Count startViewTransition calls made by the root layout's onNavigate.
		await page.evaluate(() => {
			window.__vtCount = 0
			const orig = document.startViewTransition.bind(document)
			document.startViewTransition = (cb) => {
				window.__vtCount++
				return orig(cb)
			}
		})

		// Cross-page navigation → one transition.
		await page.locator('.sidebar-wrapper').getByRole('link', { name: 'Routes' }).click()
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Routes' })).toBeVisible()
		expect(await page.evaluate(() => window.__vtCount)).toBe(1)

		// Back/forward across pages → also a transition.
		await page.goBack()
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()
		expect(await page.evaluate(() => window.__vtCount)).toBe(2)

		// The app chrome keeps its own snapshot so it stays static while the
		// content crossfades — names must stay on elements with a real box
		// (nav.sidebar is absolutely positioned; its wrapper is 0×0 and would
		// snapshot as nothing, flashing the sidebar out during transitions).
		const names = await page.evaluate(() => ({
			sidebar: getComputedStyle(document.querySelector('nav.sidebar')).viewTransitionName,
			navbar: getComputedStyle(document.querySelector('.navbar-wrapper')).viewTransitionName,
			sidebarWidth: document.querySelector('nav.sidebar').getBoundingClientRect().width
		}))
		expect(names.sidebar).toBe('sidebar')
		expect(names.navbar).toBe('navbar')
		expect(names.sidebarWidth).toBeGreaterThan(0)
	})

	test('no transition while the mobile nav drawer is open — its slide-out must stay live', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto('/deployment?project=test-project')
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Deployments' })).toBeVisible()

		await page.evaluate(() => {
			window.__vtCount = 0
			const orig = document.startViewTransition.bind(document)
			document.startViewTransition = (cb) => {
				window.__vtCount++
				return orig(cb)
			}
		})

		// Open the drawer, then navigate from it: the drawer's own slide-out
		// animates live; a view transition would freeze it and end in a jump.
		await page.locator('.icon-nav-menu').click()
		await expect(page.locator('.app-layout.is-shown-sidebar')).toBeVisible()
		await page.locator('.sidebar-wrapper').getByRole('link', { name: 'Routes' }).click()
		await expect(page.locator('.content-wrapper').getByRole('heading', { name: 'Routes' })).toBeVisible()
		expect(await page.evaluate(() => window.__vtCount)).toBe(0)
	})
})
