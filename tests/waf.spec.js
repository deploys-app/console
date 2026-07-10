import { test, expect, setMocks, getRequestLog, pickSelect } from './helpers.js'
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
		limits: [],
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
			'location.list': { ok: true, result: { items: [wafLocation] } },
			// No zones anywhere → every supported location is available.
			'waf.list': { ok: true, result: { project: 'test-project', items: [] } }
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
			'waf.list': { ok: true, result: { project: 'test-project', items: [wafZone({ location: 'gke' })] } }
		})

		await page.goto('/waf/create?project=test-project')
		await expect(page.getByText('Every location already has a firewall configured')).toBeVisible()
	})

	test('falls back to the waf.get fan-out when waf.list is forbidden', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [wafLocation] } },
			// A role with waf.get but not waf.list still gets an accurately
			// filtered page: the loader falls back to per-location waf.get.
			'waf.list': { ok: false, error: { message: 'iam: forbidden' } },
			'waf.get': { ok: true, result: wafZone({ location: 'gke' }) }
		})

		await page.goto('/waf/create?project=test-project')
		await expect(page.getByText('Every location already has a firewall configured')).toBeVisible()

		const log = await getRequestLog()
		expect(log.some((r) => r.path === '/waf.get')).toBe(true)
	})
})

test.describe('firewall copy', () => {
	const gkeWaf = { ...defaultLocation, id: 'gke', features: { waf: true } }
	const sgpWaf = { ...defaultLocation, id: 'sgp', features: { waf: true } }
	const osaka = { ...defaultLocation, id: 'osaka', features: {} } // no waf

	/** The source zone used across the copy tests: one rule + one rate limit. */
	function sourceZone () {
		return wafZone({
			location: 'gke',
			description: 'prod edge',
			rules: [wafRule({ id: 'rule-aaaaaa' })],
			limits: [{
				id: 'lim-bbbbbb',
				description: '',
				key: ['ip'],
				rate: 100,
				window: '1m',
				algorithm: 'sliding',
				mode: 'enforce'
			}]
		})
	}

	test('copies a zone to an empty waf location with fresh ids', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [gkeWaf, sgpWaf, osaka] } },
			'waf.list': { ok: true, result: { project: 'test-project', items: [sourceZone()] } },
			'waf.metrics': { ok: true, result: { series: [], total: 0 } },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf?project=test-project')
		await page.getByRole('button', { name: 'Copy firewall in gke' }).click()

		const panel = page.locator('.modal.is-active .modal-panel')
		await expect(panel.getByText('1 rule', { exact: true })).toBeVisible()
		await expect(panel.getByText('1 rate limit', { exact: true })).toBeVisible()

		// Only sgp is eligible: gke is the source, osaka lacks the waf feature.
		await panel.locator('#copy-target-location').click()
		await expect(page.getByRole('option', { name: 'sgp', exact: true })).toBeVisible()
		await expect(page.getByRole('option', { name: 'gke', exact: true })).toHaveCount(0)
		await expect(page.getByRole('option', { name: 'osaka', exact: true })).toHaveCount(0)
		await page.getByRole('option', { name: 'sgp', exact: true }).click()

		// The description is prefilled from the source zone.
		await expect(panel.locator('#copy-description')).toHaveValue('prod edge')

		await panel.getByRole('button', { name: 'Copy firewall', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.location).toBe('sgp')
		expect(body.description).toBe('prod edge')
		expect(body.rules[0].id).toBe('')
		expect(body.rules[0].expression).toBe('request.path == "/admin"')
		expect(body.limits[0].id).toBe('')
		expect(body.limits[0].rate).toBe(100)
	})

	test('reports when no empty waf location exists', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [gkeWaf, sgpWaf] } },
			'waf.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [sourceZone(), wafZone({ location: 'sgp' })]
				}
			},
			'waf.metrics': { ok: true, result: { series: [], total: 0 } }
		})

		await page.goto('/waf?project=test-project')
		await page.getByRole('button', { name: 'Copy firewall in gke' }).click()

		const panel = page.locator('.modal.is-active .modal-panel')
		await expect(panel.getByText('Every WAF-capable location already has a firewall')).toBeVisible()
		await expect(panel.getByRole('button', { name: 'Copy firewall', exact: true })).toHaveCount(0)
	})

	test('copy is available from the manage page', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: sourceZone() },
			'location.list': { ok: true, result: { items: [gkeWaf, sgpWaf] } },
			'waf.list': { ok: true, result: { project: 'test-project', items: [sourceZone()] } },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		await page.getByRole('button', { name: 'Copy to location' }).click()

		await pickSelect(page, 'copy-target-location', 'sgp')
		await page.getByRole('button', { name: 'Copy firewall', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
		expect(JSON.parse(setReq?.body ?? '{}').location).toBe('sgp')
	})

	test('copy is gated on waf.set', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [gkeWaf, sgpWaf, osaka] } },
			'waf.list': { ok: true, result: { project: 'test-project', items: [sourceZone()] } },
			'waf.metrics': { ok: true, result: { series: [], total: 0 } },
			'me.permissions': { ok: true, result: { permissions: ['waf.list', 'waf.get'], admin: false } }
		})

		await page.goto('/waf?project=test-project')

		const copyButton = page.getByRole('button', { name: 'Copy firewall in gke' })
		await expect(copyButton).toBeDisabled()
		// The wrapping span carries the deny tooltip naming the missing grant.
		await expect(page.locator('span.inline-flex', { has: copyButton }))
			.toHaveAttribute('title', "You don't have permission to do this (requires waf.set).")

		// A click never opens the modal.
		await copyButton.click({ force: true })
		await expect(page.locator('.modal.is-active')).toHaveCount(0)

		// Both permissions are required: waf.set alone (no waf.list) is denied too.
		await setMocks({
			'me.permissions': { ok: true, result: { permissions: ['waf.get', 'waf.set'], admin: false } }
		})
		await page.goto('/waf?project=test-project')
		await expect(page.getByRole('button', { name: 'Copy firewall in gke' })).toBeDisabled()
	})

	test('aborts when the target gains a zone before confirm', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [gkeWaf, sgpWaf, osaka] } },
			'waf.list': { ok: true, result: { project: 'test-project', items: [sourceZone()] } },
			'waf.metrics': { ok: true, result: { series: [], total: 0 } },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf?project=test-project')
		await page.getByRole('button', { name: 'Copy firewall in gke' }).click()

		const panel = page.locator('.modal.is-active .modal-panel')
		await pickSelect(page, 'copy-target-location', 'sgp')

		// Someone creates a zone on sgp while the modal sits open.
		await setMocks({
			'waf.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [sourceZone(), wafZone({ location: 'sgp' })]
				}
			}
		})

		await panel.getByRole('button', { name: 'Copy firewall', exact: true }).click()

		// The confirm-time re-check catches the occupied target: no waf.set fires.
		await expect(page.getByText('A firewall was just created in sgp.')).toBeVisible()
		const log = await getRequestLog()
		expect(log.some((r) => r.path === '/waf.set')).toBe(false)
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
