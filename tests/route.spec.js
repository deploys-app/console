import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { sampleRoute, sampleDeployment } from './fixtures/mocks.js'

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
})
