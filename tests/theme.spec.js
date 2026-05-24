import { test, unauthedTest, expect } from './helpers.js'

const tokenCookie = {
	name: 'token',
	value: 'test-token',
	url: 'http://localhost:4173',
	httpOnly: true,
	sameSite: /** @type {const} */ ('Lax')
}

unauthedTest.describe('theme — default follows OS', () => {
	unauthedTest('applies dark when OS prefers dark and no theme cookie', async ({ context, page }) => {
		await context.addCookies([tokenCookie])
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/project')
		await expect(page.locator('html')).toHaveClass(/dark/)
	})

	unauthedTest('stays light when OS prefers light and no theme cookie', async ({ context, page }) => {
		await context.addCookies([tokenCookie])
		await page.emulateMedia({ colorScheme: 'light' })
		await page.goto('/project')
		await expect(page.locator('html')).not.toHaveClass(/dark/)
	})

	unauthedTest('explicit theme cookie overrides OS preference', async ({ context, page }) => {
		await context.addCookies([
			tokenCookie,
			{ name: 'theme', value: 'light', url: 'http://localhost:4173', sameSite: 'Lax' }
		])
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/project')
		await expect(page.locator('html')).not.toHaveClass(/dark/)
	})
})

test.describe('theme — system toggle', () => {
	test('System option clears the choice and follows the OS', async ({ page }) => {
		// Signed-in fixture stores an explicit theme=dark cookie.
		await page.emulateMedia({ colorScheme: 'light' })
		await page.goto('/project')
		await expect(page.locator('html')).toHaveClass(/dark/)

		await page.getByRole('button', { name: 'Theme' }).hover()
		await page.getByRole('button', { name: 'System' }).click()

		await expect(page.locator('html')).not.toHaveClass(/dark/)
	})
})
