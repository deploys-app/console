import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { sampleRoute, sampleDeployment, sampleDomain } from './fixtures/mocks.js'

test.describe('routes', () => {
	test('lists routes', async ({ page }) => {
		await setMocks({
			'route.list': {
				ok: true,
				result: {
					items: [
						sampleRoute,
						{ ...sampleRoute, domain: 'api.example.com', path: '/v1', target: 'redirect://https://api.internal' }
					]
				}
			}
		})

		await page.goto('/route?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Routes' })).toBeVisible()
		await expect(main.locator('table tbody tr')).toHaveCount(2)
		await expect(main.getByText('https://example.com/', { exact: true })).toBeVisible()
		await expect(main.getByText('https://api.example.com/v1', { exact: true })).toBeVisible()
		// Each row exposes the live URL via an explicit open-in-new-tab icon button.
		await expect(main.getByRole('link', { name: 'Open route in new tab' }).first())
			.toHaveAttribute('href', 'https://example.com/')
	})

	test('empty state when no routes', async ({ page }) => {
		await page.goto('/route?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
	})

	test('clicking a row opens the route detail page', async ({ page }) => {
		await setMocks({
			'route.list': { ok: true, result: { items: [sampleRoute] } },
			'route.get': { ok: true, result: sampleRoute }
		})

		await page.goto('/route?project=test-project')
		await page.locator('table tbody tr').first().click()

		await expect(page).toHaveURL(/\/route\/manage\?project=test-project&location=gke&domain=example\.com&path=%2F/)
	})
})

test.describe('route detail', () => {
	const detailUrl = '/route/manage?project=test-project&location=gke&domain=example.com&path=%2F'

	test('renders the route read-only with edit and delete actions', async ({ page }) => {
		await setMocks({
			'route.get': { ok: true, result: sampleRoute }
		})

		await page.goto(detailUrl)

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Route detail' })).toBeVisible()

		// The routing flow links the incoming URL out and the destination to its
		// deployment detail page (name derived from the deployment:// target).
		await expect(main.getByRole('link', { name: 'example.com/', exact: true }))
			.toHaveAttribute('href', 'https://example.com/')
		await expect(main.getByRole('link', { name: 'web', exact: true }))
			.toHaveAttribute('href', '/deployment/detail?project=test-project&location=gke&name=web')

		// deployment://web is split into a friendly Deployment type, and with no
		// auth config the route reads as Public.
		await expect(main.getByText('Deployment', { exact: true }).first()).toBeVisible()
		await expect(main.getByText('Public', { exact: true }).first()).toBeVisible()

		// Editing lives on a dedicated page; deleting stays here.
		await expect(page.locator('.page-head').getByRole('link', { name: 'Edit' }))
			.toHaveAttribute('href', '/route/edit?project=test-project&location=gke&domain=example.com&path=%2F')
		await expect(page.getByRole('button', { name: 'Delete route' })).toBeVisible()
		// Read-only: no editable target/auth controls on the detail page.
		await expect(page.locator('#input-auth')).toHaveCount(0)
	})

	test('shows the Host header override when set', async ({ page }) => {
		await setMocks({
			'route.get': {
				ok: true,
				result: {
					...sampleRoute,
					domain: 'legacy.example.com',
					target: 'http://203.0.113.10:8080',
					config: { host: 'legacy.internal' }
				}
			}
		})

		await page.goto('/route/manage?project=test-project&location=gke&domain=legacy.example.com&path=%2F')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Host header', { exact: true })).toBeVisible()
		await expect(main.getByText('legacy.internal', { exact: true })).toBeVisible()
	})

	test('delete confirms then calls route.delete', async ({ page }) => {
		await setMocks({
			'route.get': { ok: true, result: sampleRoute },
			'route.delete': { ok: true, result: {} }
		})

		await page.goto(detailUrl)

		await page.getByRole('button', { name: 'Delete route' }).click()
		await page.locator('.swal2-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.delete')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.delete')
		if (!req) throw new Error('expected a route.delete request')
		expect(JSON.parse(req.body)).toMatchObject({ location: 'gke', domain: 'example.com', path: '/' })
		await expect(page).toHaveURL(/\/route\?project=test-project/)
	})
})

test.describe('route edit', () => {
	const editUrl = '/route/edit?project=test-project&location=gke&domain=example.com&path=%2F'

	test('seeds the form from the existing route', async ({ page }) => {
		await setMocks({
			'route.get': {
				ok: true,
				result: {
					...sampleRoute,
					target: 'redirect://https://elsewhere.example.com',
					config: { basicAuth: { user: 'admin', password: 'secret' } }
				}
			}
		})

		await page.goto(editUrl)

		await expect(page.getByRole('heading', { name: 'Edit route' })).toBeVisible()
		// redirect:// prefix is stripped into the value field.
		await expect(page.locator('#input-target_value')).toHaveValue('https://elsewhere.example.com')
		// Basic-auth config seeds the auth fields.
		await expect(page.locator('#input-basic_auth_user')).toHaveValue('admin')
		// A redirect target has no upstream, so the Host override field is hidden.
		await expect(page.locator('#input-host')).toHaveCount(0)
	})

	test('seeds and saves the Host header override for an external route', async ({ page }) => {
		await setMocks({
			'route.get': {
				ok: true,
				result: {
					...sampleRoute,
					domain: 'legacy.example.com',
					target: 'http://203.0.113.10:8080',
					config: { host: 'legacy.internal' }
				}
			},
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto('/route/edit?project=test-project&location=gke&domain=legacy.example.com&path=%2F')

		// The external http:// target shows the Host field, seeded from config.host.
		await expect(page.locator('#input-host')).toHaveValue('legacy.internal')

		await page.locator('#input-host').fill('new.internal')
		await page.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		expect(body.target).toBe('http://203.0.113.10:8080')
		expect(body.config.host).toBe('new.internal')
	})

	test('hides the host field for a deployment target', async ({ page }) => {
		// The override is external-only, so a deployment route never shows it.
		await setMocks({
			'route.get': { ok: true, result: sampleRoute },
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } }
		})

		await page.goto(editUrl)

		await expect(page.locator('#input-host')).toHaveCount(0)
	})

	test('saves forward-auth config via route.createV2 and returns to the detail page', async ({ page }) => {
		await setMocks({
			'route.get': {
				ok: true,
				result: { ...sampleRoute, target: 'redirect://https://elsewhere.example.com', config: {} }
			},
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto(editUrl)

		// Switch protection to forward auth and fill it in (the trailing blank
		// line proves empty header entries are dropped before the request).
		await page.locator('#input-auth').click()
		await page.getByRole('option', { name: 'Forward Auth' }).click()
		await page.locator('#input-forward_auth_target').fill('https://auth.example.com/verify')
		await page.locator('#input-forward_auth_request_headers').fill('X-User\n')
		await page.locator('#input-forward_auth_response_headers').fill('X-Auth')

		await page.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		expect(body.location).toBe('gke')
		expect(body.domain).toBe('example.com')
		expect(body.path).toBe('/')
		expect(body.target).toBe('redirect://https://elsewhere.example.com')
		expect(body.config.forwardAuth).toEqual({
			target: 'https://auth.example.com/verify',
			authRequestHeaders: ['X-User'],
			authResponseHeaders: ['X-Auth']
		})
		expect(body.config.basicAuth).toBeNull()

		// On success the edit page returns to the route detail page.
		await expect(page).toHaveURL(/\/route\/manage\?project=test-project&location=gke&domain=example\.com&path=%2F/)
	})

	test('editing a deployment route lists deployments', async ({ page }) => {
		await setMocks({
			'route.get': { ok: true, result: sampleRoute },
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } }
		})

		await page.goto(editUrl)

		// Deployment target → the deployment picker is populated for the location.
		await page.locator('#input-target_deployment').click()
		await expect(page.getByRole('option', { name: 'web' })).toBeVisible()
	})

	test('flags a paused deployment and warns once it is selected', async ({ page }) => {
		await setMocks({
			'route.get': { ok: true, result: sampleRoute },
			'deployment.list': {
				ok: true,
				result: {
					items: [
						sampleDeployment,
						{ ...sampleDeployment, name: 'web-paused', action: 'pause' }
					]
				}
			}
		})

		await page.goto(editUrl)

		await page.locator('#input-target_deployment').click()
		// The paused deployment stays selectable but carries a Paused badge.
		const pausedOption = page.getByRole('option', { name: /web-paused/ })
		await expect(pausedOption.getByText('Paused', { exact: true })).toBeVisible()

		// Selecting it surfaces the inline warning; a running deployment doesn't.
		const warning = page.getByText(/won.t serve traffic until you resume it/)
		await pausedOption.click()
		await expect(warning).toBeVisible()

		await page.locator('#input-target_deployment').click()
		await page.getByRole('option', { name: 'web', exact: true }).click()
		await expect(warning).toHaveCount(0)
	})
})

test.describe('route create — deployment picker', () => {
	const createUrl = '/route/create?project=test-project'

	/** @param {import('@playwright/test').Page} page */
	async function pickDeploymentTarget (page) {
		await page.goto(createUrl)
		await page.locator('#input-location').click()
		await page.getByRole('option', { name: 'gke' }).click()
		await page.locator('#input-target_prefix').click()
		await page.getByRole('option', { name: 'Deployment', exact: true }).click()
		await page.locator('#input-target_deployment').click()
	}

	test('badges paused deployments and warns when one is chosen', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: true,
				result: {
					items: [
						sampleDeployment,
						{ ...sampleDeployment, name: 'web-paused', action: 'pause' }
					]
				}
			}
		})

		await pickDeploymentTarget(page)

		const runningOption = page.getByRole('option', { name: 'web', exact: true })
		const pausedOption = page.getByRole('option', { name: /web-paused/ })
		await expect(runningOption).toBeVisible()
		await expect(pausedOption.getByText('Paused', { exact: true })).toBeVisible()

		const warning = page.getByText(/won.t serve traffic until you resume it/)

		await runningOption.click()
		await expect(warning).toHaveCount(0)

		await page.locator('#input-target_deployment').click()
		await pausedOption.click()
		await expect(warning).toBeVisible()
	})
})

test.describe('route create — host override', () => {
	const createUrl = '/route/create?project=test-project'

	async function selectLocationAndDomain (page) {
		await page.goto(createUrl)
		await page.locator('#input-location').click()
		await page.getByRole('option', { name: 'gke' }).click()
		await page.locator('#input-domain').click()
		await page.getByRole('option', { name: 'example.com', exact: true }).click()
	}

	test('shows the host field for External server and sends config.host', async ({ page }) => {
		await setMocks({
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'route.createV2': { ok: true, result: {} }
		})

		await selectLocationAndDomain(page)

		// Redirect has no upstream → no host field.
		await page.locator('#input-target_prefix').click()
		await page.getByRole('option', { name: 'Redirect', exact: true }).click()
		await expect(page.locator('#input-host')).toHaveCount(0)

		// External server → the host override field appears.
		await page.locator('#input-target_prefix').click()
		await page.getByRole('option', { name: 'External server (HTTP)', exact: true }).click()
		await expect(page.locator('#input-host')).toBeVisible()

		await page.locator('#input-target_value').fill('203.0.113.10:8080')
		await page.locator('#input-host').fill('legacy.internal')
		await page.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		expect(body.target).toBe('http://203.0.113.10:8080')
		expect(body.config.host).toBe('legacy.internal')
	})

	test('hides the host field for a deployment target', async ({ page }) => {
		// The override is external-only (the api rejects host on a deployment
		// target), so the field never appears for a deployment route.
		await setMocks({
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'deployment.list': { ok: true, result: { items: [sampleDeployment] } }
		})

		await selectLocationAndDomain(page)
		await page.locator('#input-target_prefix').click()
		await page.getByRole('option', { name: 'Deployment', exact: true }).click()
		await page.locator('#input-target_deployment').click()
		await page.getByRole('option', { name: 'web', exact: true }).click()

		await expect(page.locator('#input-host')).toHaveCount(0)
	})
})
