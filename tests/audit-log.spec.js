import { test, expect, setMocks } from './helpers.js'
import { sampleAuditLogItem } from './fixtures/mocks.js'

test.describe('audit log', () => {
	test('lists audit log entries', async ({ page }) => {
		await setMocks({
			'auditLog.list': {
				ok: true,
				result: { items: [sampleAuditLogItem] }
			}
		})

		await page.goto('/audit-log?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Audit Logs' })).toBeVisible()
		await expect(main.getByText('deployment.deploy')).toBeVisible()
		await expect(main.getByText('[email protected]')).toBeVisible()
		await expect(main.getByRole('cell', { name: /Success/ })).toBeVisible()
		await expect(main.getByText('deployed revision 1')).toBeVisible()
	})

	test('empty state when no entries', async ({ page }) => {
		await page.goto('/audit-log?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('applies filters via query string', async ({ page }) => {
		await setMocks({
			'auditLog.list': {
				ok: true,
				result: { items: [sampleAuditLogItem] }
			}
		})

		await page.goto('/audit-log?project=test-project&resourceType=deployment&actor=user@example.com&outcome=success')

		const main = page.locator('.content-wrapper')
		await expect(main.locator('#filter-resource-type')).toContainText('Deployment')
		await expect(main.locator('#filter-actor')).toHaveValue('user@example.com')
		await expect(main.locator('#filter-outcome')).toContainText('Success')
		await expect(main.getByText('deployment.deploy')).toBeVisible()
	})
})
