import { test, expect } from './helpers.js'

test.describe('firewall rule builder', () => {
	// The add-rule page opens the visual condition builder. Changing a condition's
	// field must clear any value already entered, since a value typed for one field
	// rarely makes sense for another.
	test('clears the value when the field changes', async ({ page }) => {
		await page.goto('/waf/edit?project=acme&location=gke.cluster-rcf2')

		// Visual builder starts with no rows — add a blank condition. Retry the
		// click until a row appears so the test doesn't race page hydration (the
		// server-rendered button exists before Svelte attaches its handler).
		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()

		// Enter a value for the default (Path) field.
		await value.fill('/admin')
		await expect(value).toHaveValue('/admin')

		// Switch the field via the custom Select.
		await page.locator('#waf-field').click()
		await page.getByRole('option', { name: 'Host' }).click()

		// The previously entered value is reset to empty.
		await expect(page.locator('#waf-value')).toHaveValue('')
	})
})
