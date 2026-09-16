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
		id: 'rule-block1',
		description: 'block admin',
		expression: 'request.path.startsWith("/admin")',
		action: 'block',
		status: 403,
		message: 'Forbidden',
		priority: 0,
		...overrides
	}
}

/**
 * 26-char, Crockford-base32-shaped event id whose lexicographic order follows
 * `n` — bigger n sorts later, so pages can be built newest-first.
 * @param {number} n
 */
function eventId (n) {
	return '01J' + String(n).padStart(23, '0')
}

/** Build a WAF event fixture. */
function wafEvent (overrides = {}) {
	return {
		id: eventId(1),
		at: new Date().toISOString(),
		ruleId: 'rule-block1',
		action: 'block',
		status: 403,
		clientIp: '203.0.113.9',
		country: 'TH',
		asn: 7470,
		method: 'POST',
		host: 'acme.example.com',
		path: '/admin/login',
		...overrides
	}
}

/** Default mocks for a metrics page visit with the given zone + events page. */
function metricsMocks (zone, eventsResult) {
	return {
		'location.list': { ok: true, result: { items: [wafLocation] } },
		'waf.get': { ok: true, result: zone },
		'waf.metrics': { ok: true, result: { series: [], total: 0 } },
		'waf.events': { ok: true, result: eventsResult }
	}
}

test.describe('firewall recent events', () => {
	test('renders sampled events with rule links and the sampling caption', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule()] })
		await setMocks(metricsMocks(zone, {
			items: [
				wafEvent({ id: eventId(2) }),
				wafEvent({
					id: eventId(1),
					ruleId: 'rule-log1',
					action: 'log',
					status: 0,
					clientIp: '198.51.100.4',
					country: '',
					method: 'GET',
					path: '/robots.txt'
				})
			],
			next: ''
		}))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const panel = page.locator('.events-panel')

		await expect(panel.getByRole('heading', { name: 'Recent events' })).toBeVisible()
		// The permanent sampling caption, worded per the spec.
		await expect(panel.getByText('Sampled — a bounded number of events per firewall')).toBeVisible()

		// Row content: IP (mono), country name, method, host, path.
		await expect(panel.getByText('203.0.113.9')).toBeVisible()
		await expect(panel.getByText('Thailand')).toBeVisible()
		await expect(panel.getByText('/admin/login')).toBeVisible()
		await expect(panel.getByText('/robots.txt')).toBeVisible()

		// Action badges.
		await expect(panel.locator('.act-badge', { hasText: 'Block' })).toHaveCount(1)
		await expect(panel.locator('.act-badge', { hasText: 'Log' })).toHaveCount(1)

		// A live rule renders as a link to its row on the manage page, tooltip =
		// the rule description from waf.get.
		const ruleLink = panel.locator('a', { hasText: 'rule-block1' })
		await expect(ruleLink).toHaveAttribute('href', '/waf/manage?project=test-project&location=gke#waf-rule-rule-block1')
		await expect(ruleLink).toHaveAttribute('title', 'block admin')
	})

	test('renders a deleted rule id unlinked with a tooltip', async ({ page }) => {
		// The event's rule id matches nothing in waf.get (events outlive rules by
		// up to 3 days) — it must render as plain text, never a dead link.
		const zone = wafZone({ rules: [wafRule()] })
		await setMocks(metricsMocks(zone, {
			items: [wafEvent({ id: eventId(1), ruleId: 'rule-gone' })],
			next: ''
		}))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const panel = page.locator('.events-panel')

		const deleted = panel.getByText('rule-gone', { exact: true })
		await expect(deleted).toBeVisible()
		await expect(deleted).toHaveAttribute('title', 'rule no longer exists')
		await expect(panel.locator('a', { hasText: 'rule-gone' })).toHaveCount(0)
	})

	test('shows the empty state when the zone has no events', async ({ page }) => {
		await setMocks(metricsMocks(wafZone({ rules: [wafRule()] }), { items: [], next: '' }))

		await page.goto('/waf/metrics?project=test-project&location=gke')

		await expect(page.getByText('No events in the last 3 days.')).toBeVisible()
	})

	test('passes a hand-edited ?ruleId= straight to waf.events and keeps it selectable', async ({ page }) => {
		// A deleted rule is absent from the rule select's options, but its events
		// stay filterable via the query param, which maps 1:1 onto the RPC filter.
		await setMocks(metricsMocks(wafZone({ rules: [wafRule()] }), { items: [], next: '' }))

		await page.goto('/waf/metrics?project=test-project&location=gke&ruleId=rule-gone')

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.events')
		}).toBe(true)

		const req = (await getRequestLog()).find((r) => r.path === '/waf.events')
		const body = JSON.parse(req?.body ?? '{}')
		expect(body.ruleId).toBe('rule-gone')
		expect(body.limit).toBe(50)

		// The active filter stays visible in the select rather than a blank trigger.
		await expect(page.locator('#events-filter-rule')).toContainText('rule-gone (deleted)')
	})

	test('action filter refetches server-side and lands in the URL', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule()] })
		await setMocks(metricsMocks(zone, {
			items: [wafEvent({ id: eventId(1) })],
			next: ''
		}))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		await expect(page.locator('.events-panel').getByText('203.0.113.9')).toBeVisible()

		await pickSelect(page, 'events-filter-action', 'Block')

		// The filter maps onto the waf.events `action` param — server-side, not
		// client-side.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.events' && JSON.parse(r.body || '{}').action === 'block')
		}).toBe(true)

		// And is reflected into the query string for shareable URLs.
		await expect(page).toHaveURL(/action=block/)
	})

	test('rule filter refetches with the short rule id', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule({ id: 'rule-block1', description: 'block admin' })] })
		await setMocks(metricsMocks(zone, { items: [], next: '' }))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		await expect(page.getByText('No events in the last 3 days.')).toBeVisible()

		// Options come from waf.get's current rules, labeled by description.
		await pickSelect(page, 'events-filter-rule', 'block admin')

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.events' && JSON.parse(r.body || '{}').ruleId === 'rule-block1')
		}).toBe(true)

		await expect(page).toHaveURL(/ruleId=rule-block1/)
	})

	test('load more pages with the keyset cursor', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule()] })
		// A full first page (50 = the page size) with `next` set → Load more shows.
		const first = Array.from({ length: 50 }, (_, i) => wafEvent({
			id: eventId(100 - i),
			path: `/admin/page-${i}`
		}))
		await setMocks(metricsMocks(zone, { items: first, next: first[first.length - 1].id }))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const rows = page.locator('.events-panel tbody tr')
		await expect(rows).toHaveCount(50)

		// Second page appended after the first.
		await setMocks({
			'waf.events': {
				ok: true,
				result: { items: [wafEvent({ id: eventId(1), path: '/admin/last' })], next: '' }
			}
		})
		await page.getByRole('button', { name: 'Load more' }).click()

		await expect(rows).toHaveCount(51)
		await expect(page.locator('.events-panel').getByText('/admin/last')).toBeVisible()

		// The second request carried the cursor: before = previous page's next.
		const reqs = (await getRequestLog()).filter((r) => r.path === '/waf.events')
		expect(reqs.length).toBe(2)
		expect(JSON.parse(reqs[1].body || '{}').before).toBe(eventId(51))

		// Exhausted → the button goes away.
		await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
	})

	test('refetches when navigating between locations without a remount', async ({ page }) => {
		// The WAF list links here per location, so ?location=A -> ?location=B is a
		// client-side navigation that REUSES this component (console#303 bug
		// class): an onMount-only fetch would keep A's events under B's header.
		const zone = wafZone({ rules: [wafRule()] })
		const locB = { ...wafLocation, id: 'sgp' }
		await setMocks({
			...metricsMocks(zone, {
				items: [wafEvent({ id: eventId(2), path: '/from-location-a' })],
				next: ''
			}),
			'location.list': { ok: true, result: { items: [wafLocation, locB] } }
		})

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const panel = page.locator('.events-panel')
		await expect(panel.getByText('/from-location-a')).toBeVisible()

		await setMocks({
			'waf.events': {
				ok: true,
				result: { items: [wafEvent({ id: eventId(3), path: '/from-location-b' })], next: '' }
			}
		})

		// Navigate via an in-page anchor click so SvelteKit's router handles it
		// client-side (goto would be a full document load — a remount). The click
		// is dispatched in-page — the layout's menu overlays a body-appended
		// element, so a pointer click can't reach it; SvelteKit's document-level
		// click handler intercepts the synthetic event all the same. The marker
		// surviving the navigation proves the document was reused.
		await page.evaluate(() => {
			/** @type {any} */ (window).__wafSpaMarker = true
			const a = document.createElement('a')
			a.href = '/waf/metrics?project=test-project&location=sgp'
			a.textContent = 'location b'
			document.body.appendChild(a)
			a.click()
		})

		await expect(panel.getByText('/from-location-b')).toBeVisible()
		await expect(panel.getByText('/from-location-a')).toHaveCount(0)
		expect(await page.evaluate(() => /** @type {any} */ (window).__wafSpaMarker)).toBe(true)

		// The refetch carried the new location.
		const reqs = (await getRequestLog()).filter((r) => r.path === '/waf.events')
		expect(JSON.parse(reqs[reqs.length - 1].body || '{}').location).toBe('sgp')
	})

	test('shows the error row on failure — never the empty state — and Try again recovers', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule()] })
		await setMocks({
			...metricsMocks(zone, { items: [], next: '' }),
			'waf.events': { ok: false, error: { message: 'boom' } }
		})

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const panel = page.locator('.events-panel')

		// A failed fetch must read as a failure, not as verified absence of events.
		await expect(panel.getByText('Something went wrong while loading events. Please try again later.')).toBeVisible()
		await expect(panel.getByText('No events in the last 3 days.')).toHaveCount(0)

		await setMocks({
			'waf.events': { ok: true, result: { items: [wafEvent({ id: eventId(1) })], next: '' } }
		})
		await panel.getByRole('button', { name: 'Try again' }).click()

		await expect(panel.getByText('203.0.113.9')).toBeVisible()
		await expect(panel.getByText('Something went wrong while loading events. Please try again later.')).toHaveCount(0)
	})

	test('a failed load more keeps loaded pages and retries the cursor fetch', async ({ page }) => {
		const zone = wafZone({ rules: [wafRule()] })
		const first = Array.from({ length: 50 }, (_, i) => wafEvent({
			id: eventId(100 - i),
			path: `/admin/page-${i}`
		}))
		await setMocks(metricsMocks(zone, { items: first, next: first[first.length - 1].id }))

		await page.goto('/waf/metrics?project=test-project&location=gke')
		const panel = page.locator('.events-panel')
		await expect(panel.getByText('/admin/page-0')).toBeVisible()

		await setMocks({ 'waf.events': { ok: false, error: { message: 'boom' } } })
		await page.getByRole('button', { name: 'Load more' }).click()

		// One affordance, not two: the error row's retry — Load more is suppressed
		// while the error shows, and the loaded pages stay on screen.
		await expect(panel.getByText('Something went wrong while loading events. Please try again later.')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
		await expect(panel.getByText('/admin/page-0')).toBeVisible()

		await setMocks({
			'waf.events': {
				ok: true,
				result: { items: [wafEvent({ id: eventId(1), path: '/admin/last' })], next: '' }
			}
		})
		await panel.getByRole('button', { name: 'Try again' }).click()

		// Retry resumed from the cursor: pages preserved, next page appended.
		await expect(panel.getByText('/admin/last')).toBeVisible()
		await expect(panel.getByText('/admin/page-0')).toBeVisible()

		const reqs = (await getRequestLog()).filter((r) => r.path === '/waf.events')
		expect(reqs.length).toBe(3)
		expect(JSON.parse(reqs[1].body || '{}').before).toBe(eventId(51))
		expect(JSON.parse(reqs[2].body || '{}').before).toBe(eventId(51))
	})
})
