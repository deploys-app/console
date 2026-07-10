import { test, expect, setMocks, getRequestLog } from './helpers.js'

// The waf.test dry-run panel (WafTestPanel) mounted on the manage page (zone
// draft mode) and the rule/limit editors (expression mode).

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

/** Build a waf.test result fixture. */
function wafTestResult (overrides = {}) {
	return {
		outcome: 'pass',
		winningRuleId: '',
		status: 0,
		message: '',
		rules: [],
		limits: [],
		valid: true,
		...overrides
	}
}

/** Open the collapsed test panel (its toggle carries the dry-run subtitle). */
async function openTestPanel (page) {
	await page.getByRole('button', { name: /Dry-run/ }).click()
}

test.describe('waf test panel — manage page (zone draft mode)', () => {
	test('runs the saved zone against a sample request and renders the outcome', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					rules: [
						wafRule({ id: 'rule-block1', expression: 'request.path.startsWith("/admin")', action: 'block', status: 403, message: 'Forbidden', priority: 0 }),
						wafRule({ id: 'rule-log1', expression: 'request.method == "GET"', action: 'log', priority: 1 })
					],
					limits: [
						{ id: 'per-ip', description: '', key: ['ip'], rate: 100, window: '1m', mode: 'enforce', filter: '' }
					]
				})
			},
			'waf.test': {
				ok: true,
				result: wafTestResult({
					outcome: 'block',
					winningRuleId: 'rule-block1',
					status: 403,
					message: 'Forbidden',
					rules: [
						{ id: 'rule-block1', action: 'block', priority: 0, matched: true, evaluated: true, terminal: true, error: '' },
						{ id: 'rule-log1', action: 'log', priority: 1, matched: true, evaluated: false, terminal: false, error: '' }
					],
					limits: [
						{ id: 'per-ip', mode: 'enforce', filterMatched: true, counted: false, error: '' }
					]
				})
			}
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		await openTestPanel(page)

		await page.locator('#waf-test-path').fill('/admin')
		await page.getByRole('button', { name: 'Run test' }).click()

		// Outcome banner + per-rule badges.
		await expect(page.getByText('Blocked by rule rule-block1 — 403 Forbidden')).toBeVisible()
		// Both rules matched — assert on the badge count, not a unique element.
		await expect(page.getByText('Matched', { exact: true })).toHaveCount(2)
		await expect(page.getByText('Not evaluated', { exact: true })).toBeVisible()
		await expect(page.getByText('Decided the outcome', { exact: true })).toBeVisible()
		// The limit's filter selects the request, but a blocked request is
		// never counted against the limit.
		await expect(page.getByText('Matches the filter — not counted (request blocked by rule rule-block1).')).toBeVisible()

		// The payload is a zone draft (rules + limits, no expression) carrying
		// the sample request.
		const testReq = (await getRequestLog()).find((r) => r.path === '/waf.test')
		const body = JSON.parse(testReq?.body ?? '{}')
		expect(body.project).toBe('test-project')
		expect(body.location).toBe('gke')
		expect(body.expression).toBeUndefined()
		expect(body.rules).toHaveLength(2)
		expect(body.limits).toHaveLength(1)
		expect(body.request.method).toBe('GET')
		expect(body.request.path).toBe('/admin')
	})

	test('renders per-rule compile errors and the rejected-on-save note', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({ rules: [wafRule({ id: 'rule-bad', expression: 'request.path ==' })] })
			},
			'waf.test': {
				ok: true,
				result: wafTestResult({
					rules: [
						{ id: 'rule-bad', action: 'log', priority: 0, matched: false, evaluated: true, terminal: false, error: 'compile error: unexpected token' }
					],
					valid: false
				})
			}
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		await openTestPanel(page)
		await page.getByRole('button', { name: 'Run test' }).click()

		await expect(page.getByText('Passed — no rule terminated this request')).toBeVisible()
		await expect(page.getByText('Error', { exact: true })).toBeVisible()
		await expect(page.getByText('compile error: unexpected token')).toBeVisible()
		await expect(page.getByText('Some expressions failed to compile — this draft would be rejected on save.')).toBeVisible()
	})

	test('renders per-item validate errors when the RPC rejects the run', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({ rules: [wafRule()] })
			},
			'waf.test': {
				ok: false,
				error: {
					message: 'api: validate error',
					items: ['request: use the host field instead of a host header', 'request: asn must not be negative']
				}
			}
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		await openTestPanel(page)
		await page.getByRole('button', { name: 'Run test' }).click()

		// The per-item messages surface inline — not the bare envelope message —
		// and no stale result renders alongside them.
		await expect(page.getByText('request: use the host field instead of a host header')).toBeVisible()
		await expect(page.getByText('request: asn must not be negative')).toBeVisible()
		await expect(page.getByText('api: validate error')).toHaveCount(0)
		await expect(page.getByText('Passed — no rule terminated this request')).toHaveCount(0)
	})

	test('disables itself when the zone has no rules and no limits', async ({ page }) => {
		// An empty zone is a legal waf.set state but an always-invalid waf.test
		// payload (ambiguous mode) — the panel must not offer to run it.
		await setMocks({
			'waf.get': { ok: true, result: wafZone() }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		await openTestPanel(page)

		await expect(page.getByText('No rules or limits to test.')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Run test' })).toHaveCount(0)
	})
})

test.describe('waf test panel — rule editor (expression mode)', () => {
	test('tests the unsaved draft expression, sending expression (not rules)', async ({ page }) => {
		await setMocks({
			'waf.test': {
				ok: true,
				result: wafTestResult({
					rules: [
						{ id: 'expression', action: 'log', priority: 0, matched: true, evaluated: true, terminal: false, error: '' }
					]
				})
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke')

		// Build a condition in the visual builder (retry across hydration).
		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()
		await value.fill('/admin')

		await openTestPanel(page)
		await page.getByRole('button', { name: 'Run test' }).click()

		await expect(page.getByText('Passed — no rule terminated this request')).toBeVisible()
		await expect(page.getByText('Matched', { exact: true })).toBeVisible()

		// Expression mode payload: the draft's CEL travels as `expression`;
		// no zone draft fields.
		const testReq = (await getRequestLog()).find((r) => r.path === '/waf.test')
		const body = JSON.parse(testReq?.body ?? '{}')
		expect(body.expression).toBe('request.path == "/admin"')
		expect(body.rules).toBeUndefined()
		expect(body.limits).toBeUndefined()
		expect(body.request.path).toBe('/')
	})

	test('is disabled until the draft has a condition', async ({ page }) => {
		await page.goto('/waf/edit?project=test-project&location=gke')
		await openTestPanel(page)

		await expect(page.getByText('Nothing to test yet — add a condition first.')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Run test' })).toHaveCount(0)
	})

	test('hides a stale result the moment the tested draft changes', async ({ page }) => {
		await setMocks({
			'waf.test': {
				ok: true,
				result: wafTestResult({
					rules: [
						{ id: 'expression', action: 'log', priority: 0, matched: true, evaluated: true, terminal: false, error: '' }
					]
				})
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke')

		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()
		await value.fill('/admin')

		await openTestPanel(page)
		await page.getByRole('button', { name: 'Run test' }).click()
		const banner = page.getByText('Passed — no rule terminated this request')
		await expect(banner).toBeVisible()

		// The result fingerprints the draft it ran against — editing the draft
		// must hide the now-stale verdict rather than let it mislead.
		await value.fill('/other')
		await expect(banner).toHaveCount(0)
	})
})

test.describe('waf test panel — limit editor (filter expression mode)', () => {
	test('appears once the filter has a condition and sends it as expression', async ({ page }) => {
		await setMocks({
			'waf.test': {
				ok: true,
				result: wafTestResult({
					rules: [
						{ id: 'expression', action: 'log', priority: 0, matched: true, evaluated: true, terminal: false, error: '' }
					]
				})
			}
		})

		await page.goto('/waf/limit?project=test-project&location=gke')

		// An empty filter matches every request — nothing to dry-run, so the
		// panel is absent until a condition exists.
		await expect(page.getByRole('button', { name: /Dry-run/ })).toHaveCount(0)

		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()
		await value.fill('/api')

		await openTestPanel(page)
		await page.getByRole('button', { name: 'Run test' }).click()
		await expect(page.getByText('Passed — no rule terminated this request')).toBeVisible()

		// The filter travels as `expression` — no zone draft fields.
		const testReq = (await getRequestLog()).find((r) => r.path === '/waf.test')
		const body = JSON.parse(testReq?.body ?? '{}')
		expect(body.expression).toBe('request.path == "/api"')
		expect(body.rules).toBeUndefined()
		expect(body.limits).toBeUndefined()
	})
})
