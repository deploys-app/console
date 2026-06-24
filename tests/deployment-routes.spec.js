import { test, expect, setMocks, getRequestLog } from './helpers.js'
import {
	defaultLocation,
	sampleDeployment,
	sampleDomain,
	sampleRoute,
	sampleStaticDeployment
} from './fixtures/mocks.js'

const detailUrl = '/deployment/detail?project=test-project&location=gke&name=web'
const routesUrl = '/deployment/routes?project=test-project&location=gke&name=web'
const staticRoutesUrl = '/deployment/routes?project=test-project&location=gke&name=website'

/**
 * Click a control whose Svelte 5 handler may not be wired up yet — a click that
 * lands mid-hydration is silently dropped. Retries the click until `reveals`
 * becomes visible, proving the handler fired. This replaces a blanket
 * `waitForLoadState('networkidle')` after every navigation, which was slow (the
 * routes page polls, so the network rarely fell idle) and only ever mattered for
 * this click race. Assert-only tests just `page.goto` — their web-first
 * assertions already auto-wait.
 * @param {import('@playwright/test').Locator} control  the button/trigger to click
 * @param {import('@playwright/test').Locator} reveals  what becoming visible proves the click landed
 */
async function clickWhenReady (control, reveals) {
	await expect(async () => {
		await control.click()
		await expect(reveals).toBeVisible({ timeout: 1000 })
	}).toPass()
}

test.describe('deployment detail — Routes tab', () => {
	test('shows the Routes tab for a WebService deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto(detailUrl)

		const tabs = page.locator('.tabs')
		await expect(tabs.getByRole('link', { name: 'Routes' })).toBeVisible()
	})

	test('shows the Routes tab for a Static deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=website')

		const tabs = page.locator('.tabs')
		await expect(tabs.getByRole('link', { name: 'Routes' })).toBeVisible()
	})

	test('hides the Routes tab for a TCPService deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, type: 'TCPService' }
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto(detailUrl)

		const tabs = page.locator('.tabs')
		await expect(tabs.getByRole('link', { name: 'Routes' })).toHaveCount(0)
	})
})

test.describe('deployment detail — Routes tab list', () => {
	test('lists only the routes that point to this deployment in this location', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': {
				ok: true,
				result: {
					items: [
						sampleRoute, // gke + deployment://web — matches
						{ ...sampleRoute, domain: 'api.example.com', path: '/v1' }, // matches too
						{ ...sampleRoute, target: 'deployment://other', domain: 'other.example.com' }, // wrong target
						{ ...sampleRoute, location: 'sin', domain: 'sin.example.com' }, // wrong location
						{ ...sampleRoute, target: 'redirect://https://elsewhere.test', domain: 'redir.example.com' } // wrong scheme
					]
				}
			}
		})

		await page.goto(routesUrl)

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Routes', exact: true })).toBeVisible()
		await expect(main.getByText('2 routes pointing to this deployment')).toBeVisible()

		const rows = main.locator('table tbody tr')
		await expect(rows).toHaveCount(2)
		await expect(main.getByText('https://example.com/', { exact: true })).toBeVisible()
		await expect(main.getByText('https://api.example.com/v1', { exact: true })).toBeVisible()
		await expect(main.getByText('https://other.example.com/')).toHaveCount(0)
		await expect(main.getByText('https://sin.example.com/')).toHaveCount(0)
		await expect(main.getByText('https://redir.example.com/')).toHaveCount(0)
	})

	test('shows the empty state when no route points to the deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto(routesUrl)

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No routes point to this deployment')).toBeVisible()
	})

	test('shows the open-in-new-tab link with the live URL', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': { ok: true, result: { items: [sampleRoute] } }
		})

		await page.goto(routesUrl)

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'Open route in new tab' }))
			.toHaveAttribute('href', 'https://example.com/')
	})
})

test.describe('deployment detail — Routes tab create', () => {
	test('creates a route pre-scoped to the deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.locator('.page-head').getByRole('button', { name: 'Create' }),
			page.locator('.modal.is-active')
		)

		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Create route' })).toBeVisible()
		// The blurb names the target deployment + location so the user knows the
		// route's location/target are locked.
		await expect(modal.getByText('web')).toBeVisible()
		await expect(modal.getByText('gke', { exact: true })).toBeVisible()

		await modal.locator('#rt-domain').click()
		await page.getByRole('option', { name: 'example.com' }).click()
		await modal.locator('#rt-path').fill('/app')

		await modal.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		// Location + target are derived from the deployment, not the form.
		expect(body).toMatchObject({
			project: 'test-project',
			location: 'gke',
			domain: 'example.com',
			path: '/app',
			target: 'deployment://web'
		})
		expect(body.config.basicAuth).toBeNull()
		expect(body.config.forwardAuth).toBeNull()
	})

	test('creates a basic-auth-protected route', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.locator('.page-head').getByRole('button', { name: 'Create' }),
			page.locator('.modal.is-active')
		)

		const modal = page.locator('.modal.is-active')
		await modal.locator('#rt-domain').click()
		await page.getByRole('option', { name: 'example.com' }).click()
		await modal.locator('#rt-path').fill('/admin')

		await modal.locator('#rt-auth').click()
		await page.getByRole('option', { name: 'Basic Auth' }).click()
		await modal.locator('#rt-basic-user').fill('admin')
		await modal.locator('#rt-basic-password').fill('s3cret')

		await modal.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		expect(body.config.basicAuth).toEqual({ user: 'admin', password: 's3cret' })
		expect(body.config.forwardAuth).toBeNull()
	})

	test('appends a subdomain when the selected domain is a wildcard', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'domain.list': {
				ok: true,
				result: {
					items: [{ ...sampleDomain, domain: 'apps.example.com', wildcard: true }]
				}
			},
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.locator('.page-head').getByRole('button', { name: 'Create' }),
			page.locator('.modal.is-active')
		)

		const modal = page.locator('.modal.is-active')
		await modal.locator('#rt-domain').click()
		await page.getByRole('option', { name: '*.apps.example.com' }).click()
		await modal.locator('#rt-subdomain').fill('billing')
		await modal.locator('#rt-path').fill('/')

		await modal.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		expect(body.domain).toBe('billing.apps.example.com')
	})
})

test.describe('deployment detail — Routes tab edit', () => {
	test('opens the edit modal with the identity locked and auth pre-filled', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': {
				ok: true,
				result: {
					items: [{
						...sampleRoute,
						config: { basicAuth: { user: 'admin', password: 'secret' } }
					}]
				}
			}
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.getByRole('button', { name: 'Edit' }),
			page.locator('.modal.is-active')
		)

		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Edit route' })).toBeVisible()
		// Identity fields are locked; auth state is rehydrated.
		await expect(modal.locator('#rt-domain-ro')).toHaveValue('example.com')
		await expect(modal.locator('#rt-domain-ro')).toHaveAttribute('readonly', '')
		await expect(modal.locator('#rt-path-ro')).toHaveValue('/')
		await expect(modal.locator('#rt-basic-user')).toHaveValue('admin')
	})

	test('saves an auth-config-only update against the existing identity', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': { ok: true, result: { items: [sampleRoute] } },
			'route.createV2': { ok: true, result: {} }
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.getByRole('button', { name: 'Edit' }),
			page.locator('.modal.is-active')
		)

		const modal = page.locator('.modal.is-active')
		await modal.locator('#rt-auth').click()
		await page.getByRole('option', { name: 'Forward Auth' }).click()
		await modal.locator('#rt-fwd-target').fill('https://auth.example.com/verify')
		await modal.locator('#rt-fwd-req').fill('X-User')

		await modal.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.createV2')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.createV2')
		if (!req) throw new Error('expected a route.createV2 request')
		const body = JSON.parse(req.body)
		// The existing identity (location, domain, path, target) goes back
		// untouched, with only the auth config changed.
		expect(body).toMatchObject({
			project: 'test-project',
			location: 'gke',
			domain: 'example.com',
			path: '/',
			target: 'deployment://web'
		})
		expect(body.config.basicAuth).toBeNull()
		expect(body.config.forwardAuth).toEqual({
			target: 'https://auth.example.com/verify',
			authRequestHeaders: ['X-User'],
			authResponseHeaders: []
		})
	})
})

test.describe('deployment detail — Routes tab delete', () => {
	test('confirms then calls route.delete with the row identity', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': { ok: true, result: { items: [sampleRoute] } },
			'route.delete': { ok: true, result: {} }
		})

		await page.goto(routesUrl)

		await clickWhenReady(
			page.getByRole('button', { name: 'Delete' }),
			page.locator('.swal2-confirm')
		)
		await page.locator('.swal2-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/route.delete')
		}).toBeTruthy()

		const req = (await getRequestLog()).find((r) => r.path === '/route.delete')
		if (!req) throw new Error('expected a route.delete request')
		expect(JSON.parse(req.body)).toMatchObject({
			project: 'test-project',
			location: 'gke',
			domain: 'example.com',
			path: '/'
		})
	})
})

test.describe('deployment detail — Routes tab works for Static too', () => {
	test('lists routes pointing to a Static deployment', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'route.list': {
				ok: true,
				result: {
					items: [{ ...sampleRoute, target: 'deployment://website' }]
				}
			}
		})

		await page.goto(staticRoutesUrl)

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('1 route pointing to this deployment')).toBeVisible()
		await expect(main.getByText('https://example.com/', { exact: true })).toBeVisible()
	})
})
