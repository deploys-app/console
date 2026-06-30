import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { defaultLocation } from './fixtures/mocks.js'

// A WAF-capable location (the default fixture location has no `waf` feature).
const wafLocation = { ...defaultLocation, id: 'gke', features: { waf: true } }

/** Build a WAF zone fixture. */
function wafZone (overrides = {}) {
	return {
		project: 'test-project',
		location: 'gke',
		description: '',
		rules: [],
		status: 'success',
		action: 'create',
		createdAt: '2024-01-01T00:00:00Z',
		createdBy: '[email protected]',
		...overrides
	}
}

/** Build a WAF rule fixture. */
function wafRule (overrides = {}) {
	return {
		id: 'rule-aaaaaa',
		description: '',
		expression: 'request.path == "/admin"',
		action: 'log',
		priority: 0,
		...overrides
	}
}

test.describe('firewall list', () => {
	test('renders zones with status and links to manage', async ({ page }) => {
		await setMocks({
			'waf.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [
						wafZone({ location: 'gke', description: 'prod edge', status: 'success', rules: [wafRule()] }),
						wafZone({ location: 'sgp', status: 'pending', action: 'create', rules: [] })
					]
				}
			},
			// The list fetches metrics per zone client-side; keep it quiet/empty.
			'waf.metrics': { ok: true, result: { series: [], total: 0 } }
		})

		await page.goto('/waf?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Firewall' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'gke', exact: true })).toBeVisible()
		await expect(main.getByRole('link', { name: 'sgp', exact: true })).toBeVisible()
		await expect(main.getByText('prod edge')).toBeVisible()
		// Settled zone shows Active; the in-flight create shows Deploying.
		await expect(main.getByText('Active')).toBeVisible()
		await expect(main.getByText('Deploying')).toBeVisible()
		// Manage shortcut points at the per-location manage page.
		await expect(main.getByRole('link', { name: 'Manage' }).first())
			.toHaveAttribute('href', /\/waf\/manage\?project=test-project&location=gke/)
	})

	test('shows the empty state when there are no zones', async ({ page }) => {
		await setMocks({
			'waf.list': { ok: true, result: { project: 'test-project', items: [] } }
		})

		await page.goto('/waf?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No firewalls yet')).toBeVisible()
		await expect(main.getByText('Create a firewall to start filtering traffic in a location.')).toBeVisible()
	})
})

test.describe('firewall create', () => {
	test('offers only unconfigured WAF locations and saves an empty zone', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [wafLocation] } }
			// waf.get is unmocked → 404 (notFound) → the location is unconfigured/available.
		})

		await page.goto('/waf/create?project=test-project')

		// Select the available location via the custom Select.
		await page.locator('#input-location').click()
		await page.getByRole('option', { name: 'gke' }).click()
		await page.locator('#input-description').fill('block bots')

		await page.getByRole('button', { name: 'Save' }).click()

		// The page persists the new zone via waf.set with an empty rule list.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.location).toBe('gke')
		expect(body.description).toBe('block bots')
		expect(body.rules).toEqual([])
	})

	test('reports when every location already has a firewall', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [wafLocation] } },
			// The only supported location already has a zone → nothing to create.
			'waf.get': { ok: true, result: wafZone({ location: 'gke' }) }
		})

		await page.goto('/waf/create?project=test-project')
		await expect(page.getByText('Every location already has a firewall configured')).toBeVisible()
	})
})

test.describe('firewall manage', () => {
	test('lists the zone rules with action badges', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					location: 'gke',
					description: 'prod edge',
					rules: [
						wafRule({ id: 'rule-block1', description: 'block admin', action: 'block', status: 403, message: 'Forbidden', priority: 0 }),
						wafRule({ id: 'rule-log1', description: '', expression: 'request.method == "POST"', action: 'log', priority: 1 })
					]
				})
			}
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('heading', { name: 'Firewall rules' })).toBeVisible()
		await expect(main.getByText('rule-block1')).toBeVisible()
		await expect(main.getByText('block admin')).toBeVisible()
		await expect(main.getByText('Block', { exact: true })).toBeVisible()
		await expect(main.getByText('Log', { exact: true })).toBeVisible()
	})

	test('disable firewall confirms then calls waf.delete', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: wafZone({ location: 'gke', rules: [wafRule()] }) },
			'waf.delete': { ok: true, result: true },
			'waf.list': { ok: true, result: { project: 'test-project', items: [] } }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await page.getByRole('button', { name: 'Disable firewall' }).click()
		// Confirm in the dialog.
		await page.locator('#app-modal-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.delete')
		}).toBe(true)

		const delReq = (await getRequestLog()).find((r) => r.path === '/waf.delete')
		expect(JSON.parse(delReq?.body ?? '{}').location).toBe('gke')
	})
})

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

	test('builds a condition and saves it as CEL', async ({ page }) => {
		await page.goto('/waf/edit?project=test-project&location=gke')

		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()

		// Default field is Path with the "equals" operator; give it a value.
		await value.fill('/admin')

		// Save becomes enabled only once the rule has a complete condition.
		const save = page.getByRole('button', { name: 'Save' })
		await expect(save).toBeEnabled()
		await save.click()

		// The whole zone is written via waf.set; the new rule carries the
		// generated CEL expression.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.location).toBe('gke')
		expect(body.rules).toHaveLength(1)
		expect(body.rules[0].expression).toBe('request.path == "/admin"')
		expect(body.rules[0].action).toBe('log')
	})

	test('opens a non-representable expression in raw mode', async ({ page }) => {
		const complex = 'request.path == "/a" && request.method == "GET" || request.host == "x"'
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					location: 'gke',
					rules: [wafRule({ id: 'rule-cx', expression: complex, action: 'log', priority: 0 })]
				})
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke&rule=rule-cx')

		// Visual editing can't represent mixed && / ||, so the Visual tab is
		// disabled and the raw CEL textarea shows the expression verbatim.
		await expect(page.getByRole('tab', { name: 'Visual' })).toBeDisabled()
		await expect(page.locator('#rule-expression-raw')).toHaveValue(complex)
	})
})
