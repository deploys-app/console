import { test, expect, setMocks } from './helpers.js'
import {
	defaultLocation,
	sampleCloudSqlProxySidecar,
	sampleDeployment
} from './fixtures/mocks.js'

test.describe('deployments', () => {
	test('lists deployments', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: true,
				result: {
					items: [
						sampleDeployment,
						{ ...sampleDeployment, name: 'api', type: 'TCPService' }
					]
				}
			}
		})

		await page.goto('/deployment?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Deploy' })).toHaveAttribute(
			'href',
			'/deployment/deploy?project=test-project'
		)
	})

	test('shows empty state when there are no deployments', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No deployments yet')).toBeVisible()
	})

	test('shows error row when the deployment.list API fails', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: false,
				error: { message: 'api: internal error' }
			}
		})
		await page.goto('/deployment?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('api: internal error')).toBeVisible()
	})
})

test.describe('deployment detail — sidecars', () => {
	test('hides sidecar row when none are configured', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		await expect(page.getByRole('cell', { name: 'Sidecars' })).toHaveCount(0)
	})

	test('renders each configured sidecar', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					sidecars: [
						sampleCloudSqlProxySidecar,
						{
							cloudSqlProxy: {
								instance: 'my-project:asia-southeast1:replica',
								port: 3307,
								credentials: ''
							}
						}
					]
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const row = page.getByRole('row').filter({ hasText: 'Sidecars' })
		await expect(row).toBeVisible()
		await expect(row.getByText('my-project:us-central1:my-db')).toBeVisible()
		await expect(row.getByText(':3306')).toBeVisible()
		await expect(row.getByText('my-project:asia-southeast1:replica')).toBeVisible()
		await expect(row.getByText(':3307')).toBeVisible()
	})
})

test.describe('deployment deploy — sidecars', () => {
	test('add, remove, and cap at two sidecars', async ({ page }) => {
		// Start from an existing deployment with no sidecars so the form is
		// fully hydrated — the new-deployment path requires picking a location
		// from a dropdown, which bind:value won't pick up via selectOption.
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, sidecars: [] }
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Sidecars' })).toBeVisible()

		const addBtn = main.getByRole('button', { name: 'Add Sidecar' })

		await addBtn.click()
		await expect(main.getByText('Sidecar #1')).toBeVisible()

		await addBtn.click()
		await expect(main.getByText('Sidecar #2')).toBeVisible()

		// Capped at 2 — the add button should disappear.
		await expect(addBtn).toHaveCount(0)

		// Remove the first sidecar and the button should reappear.
		await main.getByRole('button', { name: 'Remove sidecar' }).first().click()
		await expect(main.getByText('Sidecar #2')).toHaveCount(0)
		await expect(main.getByRole('button', { name: 'Add Sidecar' })).toBeVisible()
	})

	test('hydrates existing sidecars when editing a revision', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					sidecars: [sampleCloudSqlProxySidecar]
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Sidecar #1')).toBeVisible()
		await expect(main.locator('#input-sidecar-instance-0')).toHaveValue(
			'my-project:us-central1:my-db'
		)
		await expect(main.locator('#input-sidecar-port-0')).toHaveValue('3306')
	})
})

test.describe('deployment detail — env groups', () => {
	test('views attached env group variables in a popup', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config', 'secrets'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.get': {
				ok: true,
				result: {
					project: 'test-project',
					name: 'shared-config',
					env: { LOG_LEVEL: 'info', REGION: 'apac' },
					createdAt: '2024-01-01T00:00:00Z',
					createdBy: '[email protected]'
				}
			}
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()

		await main.getByRole('button', { name: 'shared-config' }).click()

		const dialog = page.locator('.modal-panel')
		await expect(dialog.getByRole('heading', { name: 'shared-config' })).toBeVisible()
		await expect(dialog.getByText('LOG_LEVEL')).toBeVisible()
		await expect(dialog.getByText('info')).toBeVisible()
		await expect(dialog.getByText('REGION')).toBeVisible()
		await expect(dialog.getByText('apac')).toBeVisible()
	})

	test('shows no data when deployment has no env groups', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		const envGroupTable = main.locator('section, div').filter({
			has: page.getByRole('heading', { name: 'Env Groups' })
		})
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()
		await expect(envGroupTable.getByText('Nothing here yet').first()).toBeVisible()
	})
})

test.describe('deployment deploy — env groups', () => {
	test('hydrates existing env groups when editing a revision', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.list': {
				ok: true,
				result: {
					items: [
						{
							project: 'test-project',
							name: 'shared-config',
							env: {},
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						},
						{
							project: 'test-project',
							name: 'secrets',
							env: {},
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						}
					]
				}
			}
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'shared-config' })).toBeVisible()
	})

	test('views env group variables in a popup', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.list': {
				ok: true,
				result: {
					items: [
						{
							project: 'test-project',
							name: 'shared-config',
							env: { LOG_LEVEL: 'info', REGION: 'apac' },
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						}
					]
				}
			}
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('cell', { name: 'shared-config' })).toBeVisible()

		await main.getByRole('button', { name: 'View env group' }).click()

		const dialog = page.locator('.modal-panel')
		await expect(dialog.getByRole('heading', { name: 'shared-config' })).toBeVisible()
		await expect(dialog.getByText('LOG_LEVEL')).toBeVisible()
		await expect(dialog.getByText('info')).toBeVisible()
		await expect(dialog.getByText('REGION')).toBeVisible()
		await expect(dialog.getByText('apac')).toBeVisible()
	})
})

test.describe('deployment detail — environment variables', () => {
	test('show all toggle reveals and hides every value', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					env: { SECRET_KEY: 'topsecret-value', API_URL: 'https://example.test' }
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		const showAll = main.getByRole('button', { name: 'Show all' })
		await expect(showAll).toBeVisible()
		await expect(main.getByText('topsecret-value')).toBeHidden()
		await expect(main.getByText('https://example.test')).toBeHidden()

		await showAll.click()

		await expect(main.getByText('topsecret-value')).toBeVisible()
		await expect(main.getByText('https://example.test')).toBeVisible()

		const hideAll = main.getByRole('button', { name: 'Hide all' })
		await expect(hideAll).toBeVisible()
		await hideAll.click()

		await expect(main.getByText('topsecret-value')).toBeHidden()
		await expect(main.getByText('https://example.test')).toBeHidden()
	})
})
