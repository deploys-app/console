import { test, expect, setMocks, getRequestLog, pickSelect } from './helpers.js'
import {
	defaultLocation,
	sampleDeployment,
	sampleMetricSource,
	sampleTruncatedMetricSource,
	sampleErrorMetricSource,
	sampleMetricSourceSeries,
	sampleMetricSourceQuery
} from './fixtures/mocks.js'

const threeSources = [
	sampleMetricSource,
	sampleTruncatedMetricSource,
	sampleErrorMetricSource
]

test.describe('metric sources', () => {
	test('lists sources with ok / truncated / error status', async ({ page }) => {
		await setMocks({
			'metricSource.list': { ok: true, result: { items: threeSources } }
		})

		await page.goto('/metrics-sources?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Metric sources' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api-metrics' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'worker-metrics' })).toBeVisible()

		await expect(main.getByRole('cell', { name: 'ok', exact: true })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'truncated', exact: true })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'error', exact: true })).toBeVisible()

		await expect(main.getByText('gke / web', { exact: true })).toBeVisible()
		await expect(main.getByText('/metrics', { exact: true }).first()).toBeVisible()
	})

	test('empty state when no sources', async ({ page }) => {
		await page.goto('/metrics-sources?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('gates the create button when the set permission is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['metricSource.list'], admin: false } }
		})
		await page.goto('/metrics-sources?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('button', { name: 'Create source' })).toBeDisabled()
		await expect(main.getByRole('link', { name: 'Create source' })).toHaveCount(0)
	})
})

test.describe('metric source — create', () => {
	test('submits metricSource.set with deployment, port, and path and has no URL field', async ({ page }) => {
		await setMocks({
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } },
			'metricSource.set': { ok: true, result: {} },
			'metricSource.get': { ok: true, result: sampleMetricSource },
			'metricSource.series': { ok: true, result: { items: sampleMetricSourceSeries } },
			'metricSource.query': { ok: true, result: sampleMetricSourceQuery }
		})

		await page.goto('/metrics-sources/create?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.locator('#input-url')).toHaveCount(0)
		await expect(main.getByLabel('URL', { exact: true })).toHaveCount(0)

		await main.locator('#input-name').fill('web')
		await pickSelect(page, 'input-location', 'gke')
		await pickSelect(page, 'input-deployment', 'web')
		await expect(main.locator('#input-port')).toHaveValue('9090')
		await expect(main.locator('#input-path')).toHaveValue('/metrics')

		await main.getByRole('button', { name: 'Create', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/metricSource.set')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/metricSource.set')
		if (!req) throw new Error('expected a metricSource.set request')
		const body = JSON.parse(req.body)
		expect(body.name).toBe('web')
		expect(body.location).toBe('gke')
		expect(body.deployment).toBe('web')
		expect(body.port).toBe(9090)
		expect(body.path).toBe('/metrics')
		expect(body).not.toHaveProperty('url')

		await expect(page).toHaveURL(/\/metrics-sources\/detail\?project=test-project&name=web/)
	})
})

test.describe('metric source — chart banners', () => {
	test('shows truncated, error, and empty banners on the source detail chart', async ({ page }) => {
		await setMocks({
			'metricSource.get': {
				ok: true,
				result: {
					...sampleTruncatedMetricSource,
					name: 'web',
					deployment: 'web',
					lastError: 'scrape failed: connection refused'
				}
			},
			'metricSource.series': { ok: true, result: { items: sampleMetricSourceSeries } },
			'metricSource.query': { ok: true, result: { items: [] } }
		})

		await page.goto('/metrics-sources/detail?project=test-project&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('series cap hit — extra series were dropped')).toBeVisible()
		await expect(main.getByText('scrape failed: connection refused')).toBeVisible()
		await expect(main.getByText('No custom metric samples in this window')).toBeVisible()
	})

	test('shows the Custom tab on a matching deployment with truncated and error banners', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'deployment.metrics': { ok: true, result: {} },
			'metricSource.list': {
				ok: true,
				result: {
					items: [{
						...sampleTruncatedMetricSource,
						name: 'web',
						location: 'gke',
						deployment: 'web',
						lastError: 'scrape failed: connection refused'
					}]
				}
			},
			'metricSource.series': { ok: true, result: { items: sampleMetricSourceSeries } },
			'metricSource.query': { ok: true, result: { items: [] } }
		})

		await page.goto('/deployment/metrics?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await main.getByRole('tab', { name: 'Custom' }).click()
		await expect(main.getByText('series cap hit — extra series were dropped')).toBeVisible()
		await expect(main.getByText('scrape failed: connection refused')).toBeVisible()
		await expect(main.getByText('No custom metric samples in this window')).toBeVisible()
	})
})
