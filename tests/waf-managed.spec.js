import { test, expect, setMocks, getRequestLog, pickSelect } from './helpers.js'
import { defaultLocation } from './fixtures/mocks.js'

// A managed-rules-capable location vs a WAF-only one: the manage page's
// loader pre-flights location.get and renders the card disabled ("Not
// available in this location") when features.waf.managedRules is false.
const crsLocation = { ...defaultLocation, id: 'gke', features: { waf: { managedRules: true } } }
const wafOnlyLocation = { ...defaultLocation, id: 'gke', features: { waf: {} } }

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

/** Fetch the parsed body of the first waf.set request, polling until it exists. */
async function firstWafSetBody () {
	await expect.poll(async () => {
		const log = await getRequestLog()
		return log.some((r) => r.path === '/waf.set')
	}).toBe(true)
	const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
	return JSON.parse(setReq?.body ?? '{}')
}

test.describe('managed rules card', () => {
	test('renders disabled "Not available in this location" without the feature flag', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: wafZone() },
			'location.get': { ok: true, result: wafOnlyLocation }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('heading', { name: 'Managed rules' })).toBeVisible()
		await expect(main.getByText('Not available in this location')).toBeVisible()
		// No form controls in the unavailable state.
		await expect(page.locator('#managed-enabled')).toHaveCount(0)
		await expect(page.getByRole('button', { name: 'Save managed rules' })).toHaveCount(0)
	})

	test('enable, tune, and save sends the managedRules block on waf.set', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: wafZone() },
			'location.get': { ok: true, result: crsLocation },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		// Never configured + off → nothing to save yet, controls frozen.
		const save = page.getByRole('button', { name: 'Save managed rules' })
		await expect(save).toBeDisabled()
		await expect(page.locator('#managed-mode')).toBeDisabled()
		await expect(page.locator('#managed-threshold')).toBeDisabled()

		await page.locator('#managed-enabled').check()
		await expect(save).toBeEnabled()

		// Tune: paranoia 2, threshold 7, exclude one CRS id.
		await page.locator('.paranoia-switch').getByRole('button', { name: '2', exact: true }).click()
		await page.locator('#managed-threshold').fill('7')
		await page.locator('#managed-excluded').fill('942100')
		await page.locator('#managed-excluded').press('Enter')

		await save.click()

		const body = await firstWafSetBody()
		expect(body.location).toBe('gke')
		expect(body.managedRules).toEqual({
			enabled: true,
			mode: 'enforce',
			paranoiaLevel: 2,
			anomalyThreshold: 7,
			excludedRules: [942100]
		})
		// waf.set replaces the whole zone — rules/limits are echoed alongside.
		expect(body.rules).toEqual([])
		expect(body.limits).toEqual([])
	})

	test('detect mode round-trips through the mode select', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: wafZone() },
			'location.get': { ok: true, result: crsLocation },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await page.locator('#managed-enabled').check()
		await pickSelect(page, 'managed-mode', 'Detect only (log, never block)')
		await page.getByRole('button', { name: 'Save managed rules' }).click()

		const body = await firstWafSetBody()
		expect(body.managedRules.mode).toBe('detect')
	})

	test('a stored zone pre-fills the card and reload keeps it (round-trip)', async ({ page }) => {
		const stored = {
			enabled: true,
			mode: 'enforce',
			paranoiaLevel: 3,
			anomalyThreshold: 10,
			excludedRules: [920420, 942100]
		}
		await setMocks({
			'waf.get': { ok: true, result: wafZone({ managedRules: stored }) },
			'location.get': { ok: true, result: crsLocation }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await expect(page.locator('#managed-enabled')).toBeChecked()
		await expect(page.locator('.paranoia-switch').getByRole('button', { name: '3', exact: true }))
			.toHaveAttribute('aria-pressed', 'true')
		await expect(page.locator('#managed-threshold')).toHaveValue('10')
		await expect(page.getByText('920420')).toBeVisible()
		await expect(page.getByText('942100')).toBeVisible()

		// A reload re-runs the loader against the same server state — the card
		// re-seeds identically (the enable→save→reload contract).
		await page.reload()
		await expect(page.locator('#managed-enabled')).toBeChecked()
		await expect(page.locator('#managed-threshold')).toHaveValue('10')
	})

	test('disabled-but-tuned block keeps fields populated and frozen', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					managedRules: { enabled: false, mode: 'enforce', paranoiaLevel: 2, anomalyThreshold: 5, excludedRules: [941100] }
				})
			},
			'location.get': { ok: true, result: crsLocation },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await expect(page.locator('#managed-enabled')).not.toBeChecked()
		await expect(page.getByText('Disabled — your tuning is kept for re-enable.')).toBeVisible()
		// Tuning stays visible but not editable while off.
		await expect(page.locator('#managed-mode')).toBeDisabled()
		await expect(page.locator('#managed-threshold')).toBeDisabled()
		await expect(page.locator('.paranoia-switch').getByRole('button', { name: '2', exact: true })).toBeDisabled()
		await expect(page.getByText('941100')).toBeVisible()

		// Saving while off persists enabled:false WITH the tuning (so re-enable
		// restores the exclusion list) — not a cleared block.
		const save = page.getByRole('button', { name: 'Save managed rules' })
		await expect(save).toBeEnabled()
		await save.click()

		const body = await firstWafSetBody()
		expect(body.managedRules).toEqual({
			enabled: false,
			mode: 'enforce',
			paranoiaLevel: 2,
			anomalyThreshold: 5,
			excludedRules: [941100]
		})
	})

	test('rejects out-of-range excluded rule ids client-side', async ({ page }) => {
		await setMocks({
			'waf.get': { ok: true, result: wafZone() },
			'location.get': { ok: true, result: crsLocation }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await page.locator('#managed-enabled').check()
		// 949110 is the anomaly-blocking rule — above the excludable ceiling.
		await page.locator('#managed-excluded').fill('949110')
		await page.locator('#managed-excluded').press('Enter')

		await expect(page.getByText('949110 is out of range (911100–948999)')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Save managed rules' })).toBeDisabled()
	})

	test('rule edits echo the stored managed block unchanged (whole-replace)', async ({ page }) => {
		const stored = { enabled: true, mode: 'detect', paranoiaLevel: 1, anomalyThreshold: 5, excludedRules: [942100] }
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					managedRules: stored,
					rules: [{ id: 'rule-a', description: '', expression: 'request.path == "/a"', action: 'log', priority: 0 }]
				})
			},
			'location.get': { ok: true, result: crsLocation },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		// Delete the rule; the resulting waf.set must carry the SERVER's managed
		// block — an unrelated write never drops or mutates managed rules.
		await page.getByRole('button', { name: 'Remove rule' }).click()
		await page.locator('#app-modal-confirm').click()

		const body = await firstWafSetBody()
		expect(body.rules).toEqual([])
		expect(body.managedRules).toEqual(stored)
	})

	test('never-configured zone omits managedRules on unrelated writes', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					rules: [{ id: 'rule-a', description: '', expression: 'request.path == "/a"', action: 'log', priority: 0 }]
				})
			},
			'location.get': { ok: true, result: crsLocation },
			'waf.set': { ok: true, result: {} }
		})

		await page.goto('/waf/manage?project=test-project&location=gke')

		await page.getByRole('button', { name: 'Remove rule' }).click()
		await page.locator('#app-modal-confirm').click()

		const body = await firstWafSetBody()
		// Whole-replace: omitted = stays cleared. Sending {} would persist tuning.
		expect(body).not.toHaveProperty('managedRules')
	})
})

test.describe('firewall list CRS column', () => {
	test('shows on / off / — per zone', async ({ page }) => {
		await setMocks({
			'waf.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [
						wafZone({ location: 'gke', managedRules: { enabled: true, paranoiaLevel: 1 } }),
						wafZone({ location: 'sgp', managedRules: { enabled: false, paranoiaLevel: 2 } }),
						wafZone({ location: 'blr' })
					]
				}
			},
			'waf.metrics': { ok: true, result: { series: [], total: 0 } }
		})

		await page.goto('/waf?project=test-project')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('columnheader', { name: 'CRS' })).toBeVisible()
		await expect(main.getByRole('row', { name: /gke/ }).getByText('on', { exact: true })).toBeVisible()
		await expect(main.getByRole('row', { name: /sgp/ }).getByText('off', { exact: true })).toBeVisible()
		// The never-configured zone's CRS cell (6th column) renders the em dash;
		// scope to the cell since the description and matches cells use it too.
		await expect(main.getByRole('row', { name: /blr/ }).locator('td').nth(5)).toHaveText('—')
	})
})
