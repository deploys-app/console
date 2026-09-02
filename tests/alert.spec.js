import { test, expect, setMocks, getRequestLog, pickSelect } from './helpers.js'
import {
	sampleAlertRule,
	sampleAlertEvent,
	sampleDeployment,
	sampleMetricSource,
	sampleMetricSourceSeries
} from './fixtures/mocks.js'

test.describe('alerts', () => {
	test('lists alert rules with status badges', async ({ page }) => {
		await setMocks({
			'alert.list': {
				ok: true,
				result: {
					items: [
						sampleAlertRule,
						{
							...sampleAlertRule,
							name: 'api-memory-high',
							condition: { metric: 'memory', op: '>=', threshold: 85, forMinutes: 5 },
							status: 'firing',
							lastValue: 93.2
						},
						{
							...sampleAlertRule,
							name: 'worker-requests-drop',
							condition: { metric: 'requests', op: '<=', threshold: 1, forMinutes: 15 },
							status: 'nodata',
							lastValue: null
						}
					]
				}
			}
		})

		await page.goto('/alert?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Alerts' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web-cpu-high' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api-memory-high' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'worker-requests-drop' })).toBeVisible()

		await expect(main.getByRole('cell', { name: 'ok', exact: true })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'firing', exact: true })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'nodata', exact: true })).toBeVisible()

		// Condition + target render as a human-readable one-liner.
		await expect(main.getByText('cpu >= 90% for 10m', { exact: true })).toBeVisible()
		await expect(main.getByText('memory >= 85% for 5m', { exact: true })).toBeVisible()
		await expect(main.getByText('gke / web', { exact: true }).first()).toBeVisible()
	})

	test('shows a disabled badge instead of the status for a disabled rule', async ({ page }) => {
		await setMocks({
			'alert.list': { ok: true, result: { items: [{ ...sampleAlertRule, disabled: true }] } }
		})

		await page.goto('/alert?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Disabled')).toBeVisible()
		await expect(main.getByRole('cell', { name: 'ok', exact: true })).toHaveCount(0)
	})

	test('empty state when no alert rules', async ({ page }) => {
		await page.goto('/alert?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('surfaces an API error in the list', async ({ page }) => {
		await setMocks({
			'alert.list': { ok: false, error: { message: 'api: internal error' } }
		})
		await page.goto('/alert?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText(/Something went wrong while loading this data/)).toBeVisible()
		await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible()
	})

	test('gates the create button when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['alert.list'], admin: false } }
		})
		await page.goto('/alert?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create rule' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create rule' })).toHaveCount(0)
	})
})

test.describe('alert — create', () => {
	test('submits alert.create with the target, condition, and notification settings', async ({ page }) => {
		await setMocks({
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } },
			'alert.create': { ok: true, result: {} },
			// The successful-create redirect lands on the detail page, which loads
			// the rule by name — the created name must resolve.
			'alert.get': {
				ok: true,
				result: {
					...sampleAlertRule,
					condition: { metric: 'requests', op: '>=', threshold: 500, forMinutes: 15 },
					renotifyMinutes: 120
				}
			},
			'alert.events': { ok: true, result: { items: [] } }
		})

		await page.goto('/alert/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('web-cpu-high')
		await pickSelect(page, 'input-location', 'gke')
		await pickSelect(page, 'input-deployment', 'web')
		await pickSelect(page, 'input-metric', 'Requests (per minute)')
		await main.locator('#input-threshold').fill('500')
		await main.locator('#input-for-minutes').fill('15')
		await main.getByRole('checkbox', { name: 'Notify again while still firing' }).check()
		await main.locator('#input-renotify-minutes').fill('120')

		await main.getByRole('button', { name: 'Create', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/alert.create')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/alert.create')
		if (!req) throw new Error('expected an alert.create request')
		const body = JSON.parse(req.body)
		expect(body.name).toBe('web-cpu-high')
		expect(body.target).toEqual({ location: 'gke', deployment: 'web' })
		expect(body.condition).toEqual({ metric: 'requests', op: '>=', threshold: 500, forMinutes: 15 })
		expect(body.renotifyMinutes).toBe(120)

		await expect(page).toHaveURL(/\/alert\/detail\?project=test-project&name=web-cpu-high/)
	})

	test('shows the API error in a modal when create fails', async ({ page }) => {
		await setMocks({
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } },
			'alert.create': { ok: false, error: { message: 'api: alert already exists' } }
		})

		await page.goto('/alert/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('web-cpu-high')
		await pickSelect(page, 'input-location', 'gke')
		await pickSelect(page, 'input-deployment', 'web')
		await main.locator('#input-threshold').fill('90')
		await main.locator('#input-for-minutes').fill('10')
		await main.getByRole('button', { name: 'Create', exact: true }).click()

		await expect(page.locator('#app-modal')).toBeVisible()
		await expect(page.locator('#app-modal')).toContainText('api: alert already exists')
	})

	test('disables Create when the create permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['alert.list'], admin: false } }
		})
		await page.goto('/alert/create?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create', exact: true })).toBeDisabled()
	})

	test('warns when the project has no notification channels', async ({ page }) => {
		await setMocks({
			'notification.list': { ok: true, result: { items: [] } }
		})
		await page.goto('/alert/create?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No notification channels exist yet')).toBeVisible()
	})

	test('does not warn when notification channels exist', async ({ page }) => {
		await setMocks({
			'notification.list': { ok: true, result: { items: [{ project: 'test-project', name: 'ops-webhook' }] } }
		})
		await page.goto('/alert/create?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No notification channels exist yet')).toHaveCount(0)
	})

	test('submits alert.create with a custom source and series and no deployment', async ({ page }) => {
		await setMocks({
			'metricSource.list': { ok: true, result: { items: [sampleMetricSource] } },
			'metricSource.series': { ok: true, result: { items: sampleMetricSourceSeries } },
			'alert.create': { ok: true, result: {} },
			'alert.get': {
				ok: true,
				result: {
					...sampleAlertRule,
					name: 'web-queue-depth',
					target: { kind: 'custom', source: 'web', series: 'queue_depth{queue="email"}' },
					condition: { metric: 'value', op: '>=', threshold: 10, forMinutes: 5 }
				}
			},
			'alert.events': { ok: true, result: { items: [] } }
		})

		await page.goto('/alert/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await main.locator('#input-name').fill('web-queue-depth')
		await main.getByRole('tab', { name: 'Custom' }).click()
		await pickSelect(page, 'input-source', 'web')
		await pickSelect(page, 'input-series', 'queue_depth{queue="email"}')
		await expect(main.locator('#input-metric')).toContainText('Value (gauge)')
		await main.locator('#input-threshold').fill('10')
		await main.locator('#input-for-minutes').fill('5')
		await main.getByRole('button', { name: 'Create', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/alert.create')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/alert.create')
		if (!req) throw new Error('expected an alert.create request')
		const body = JSON.parse(req.body)
		expect(body.name).toBe('web-queue-depth')
		expect(body.target).toEqual({ kind: 'custom', source: 'web', series: 'queue_depth{queue="email"}' })
		expect(body.target).not.toHaveProperty('location')
		expect(body.target).not.toHaveProperty('deployment')
		expect(body.condition).toEqual({ metric: 'value', op: '>=', threshold: 10, forMinutes: 5 })

		await expect(page).toHaveURL(/\/alert\/detail\?project=test-project&name=web-queue-depth/)
	})

	test('resets the threshold when the metric unit changes', async ({ page }) => {
		await page.goto('/alert/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.locator('#input-threshold')).toHaveValue('90')
		await pickSelect(page, 'input-metric', 'Egress (bytes per minute)')
		await expect(main.locator('#input-threshold')).toHaveValue(String(10 * 1024 * 1024))
		await pickSelect(page, 'input-metric', 'CPU (% of limit)')
		await expect(main.locator('#input-threshold')).toHaveValue('90')
	})
})

test.describe('alert — edit', () => {
	test('seeds the form from the existing rule and submits alert.update', async ({ page }) => {
		await setMocks({
			'alert.get': { ok: true, result: sampleAlertRule },
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } },
			'alert.update': { ok: true, result: {} }
		})

		await page.goto('/alert/create?project=test-project&name=web-cpu-high')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Edit alert rule' })).toBeVisible()
		await expect(main.locator('#input-name')).toHaveValue('web-cpu-high')
		await expect(main.locator('#input-name')).toHaveAttribute('readonly', '')
		await expect(main.locator('#input-threshold')).toHaveValue('90')
		await expect(main.locator('#input-for-minutes')).toHaveValue('10')
		// A still-valid target must not flash/keep a "Not found" badge after the
		// deployment list settles.
		await expect(main.getByText('Not found')).toHaveCount(0)

		await main.locator('#input-threshold').fill('95')
		await main.getByRole('button', { name: 'Save', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/alert.update')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/alert.update')
		if (!req) throw new Error('expected an alert.update request')
		const body = JSON.parse(req.body)
		expect(body.name).toBe('web-cpu-high')
		expect(body.condition.threshold).toBe(95)
		await expect(page).toHaveURL(/\/alert\/detail\?project=test-project&name=web-cpu-high/)
	})

	test('keeps a missing deployment selectable and flags it Not found', async ({ page }) => {
		await setMocks({
			'alert.get': {
				ok: true,
				result: { ...sampleAlertRule, target: { location: 'gke', deployment: 'gone' } }
			},
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } }
		})

		await page.goto('/alert/create?project=test-project&name=web-cpu-high')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Edit alert rule' })).toBeVisible()
		await expect(main.getByText('Not found')).toBeVisible()
		await expect(main.locator('#input-deployment')).toContainText('gone')
	})
})

test.describe('alert — detail', () => {
	test('renders condition, status, and transition history', async ({ page }) => {
		await setMocks({
			'alert.get': { ok: true, result: sampleAlertRule },
			'alert.events': {
				ok: true,
				result: {
					items: [
						sampleAlertEvent,
						{ at: sampleAlertEvent.at, transition: 'resolve', value: 61 }
					]
				}
			}
		})

		await page.goto('/alert/detail?project=test-project&name=web-cpu-high')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'web-cpu-high', level: 4 })).toBeVisible()
		await expect(main.locator('#d-condition')).toHaveValue('cpu >= 90% for 10m')
		await expect(main.getByRole('link', { name: 'gke / web' })).toHaveAttribute(
			'href', '/deployment/metrics?project=test-project&location=gke&name=web'
		)
		await expect(main.getByText('Trigger')).toBeVisible()
		await expect(main.getByText('Resolve')).toBeVisible()
	})

	test('deletes the rule and returns to the list', async ({ page }) => {
		await setMocks({
			'alert.get': { ok: true, result: sampleAlertRule },
			'alert.delete': { ok: true, result: {} }
		})

		await page.goto('/alert/detail?project=test-project&name=web-cpu-high')

		await page.getByRole('button', { name: 'Delete' }).click()
		await page.locator('#app-modal-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/alert.delete')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/alert.delete')
		if (!req) throw new Error('expected an alert.delete request')
		expect(JSON.parse(req.body)).toMatchObject({ name: 'web-cpu-high' })
		await expect(page).toHaveURL(/\/alert\?project=test-project/)
	})
})
