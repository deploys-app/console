import { test, expect, setMocks, getRequestLog, pickSelect } from './helpers.js'
import { sampleWafList } from './fixtures/mocks.js'

/** Build a WAF zone fixture (same shape the waf spec uses). */
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
		createdBy: 'test@example.com',
		...overrides
	}
}

test.describe('waf ip lists page', () => {
	test('renders lists with entry counts and referenced-by links', async ({ page }) => {
		await setMocks({
			'wafList.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [
						{ ...sampleWafList, referencedBy: ['gke'] },
						{ ...sampleWafList, name: 'monitoring', description: '', entries: ['192.0.2.10'], referencedBy: [] }
					]
				}
			}
		})

		await page.goto('/waf/lists?project=test-project')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('heading', { name: 'IP lists', level: 4 })).toBeVisible()
		await expect(main.getByText('office-ips')).toBeVisible()
		await expect(main.getByText('Office egress ranges')).toBeVisible()
		await expect(main.getByText('monitoring')).toBeVisible()
		// office-ips has 3 entries; the referencing zone links to its manage page.
		await expect(main.getByRole('link', { name: 'gke', exact: true }))
			.toHaveAttribute('href', /\/waf\/manage\?project=test-project&location=gke/)
	})

	test('shows the empty state when there are no lists', async ({ page }) => {
		await page.goto('/waf/lists?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No IP lists yet')).toBeVisible()
	})

	test('creates a list via the modal', async ({ page }) => {
		await setMocks({ 'wafList.set': { ok: true, result: {} } })

		await page.goto('/waf/lists?project=test-project')
		await page.getByRole('button', { name: 'New list' }).click()

		const name = page.locator('#waf-list-modal-name')
		await expect(name).toBeVisible()
		await name.fill('office-ips')
		await page.locator('#waf-list-modal-description').fill('Office egress ranges')
		await page.locator('#waf-list-modal-entries').fill('203.0.113.0/24\n198.51.100.7')
		await expect(page.getByText('2 entries (max 1000).')).toBeVisible()

		await page.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/wafList.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/wafList.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.project).toBe('test-project')
		expect(body.name).toBe('office-ips')
		expect(body.description).toBe('Office egress ranges')
		expect(body.type).toBe('ip')
		expect(body.entries).toEqual(['203.0.113.0/24', '198.51.100.7'])
	})

	test('validates entries live and gates Save on them', async ({ page }) => {
		await page.goto('/waf/lists?project=test-project')
		await page.getByRole('button', { name: 'New list' }).click()

		await page.locator('#waf-list-modal-name').fill('office-ips')
		await page.locator('#waf-list-modal-entries').fill('203.0.113.7\nnot-an-ip')

		// Line-level error names the offending line; Save stays disabled.
		await expect(page.getByText('line 2: "not-an-ip" is not an IP address or CIDR')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

		// Fixing the entry re-enables Save.
		await page.locator('#waf-list-modal-entries').fill('203.0.113.7')
		await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()

		// An invalid name also gates Save.
		await page.locator('#waf-list-modal-name').fill('AB')
		await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
	})

	test('editing keeps the name immutable and echoes the stored entries', async ({ page }) => {
		await setMocks({
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [sampleWafList] }
			},
			'wafList.set': { ok: true, result: {} }
		})

		await page.goto('/waf/lists?project=test-project')
		await page.getByRole('button', { name: 'Edit IP list' }).click()

		const name = page.locator('#waf-list-modal-name')
		await expect(name).toBeVisible()
		await expect(name).toHaveValue('office-ips')
		await expect(name).toHaveAttribute('readonly', '')
		await expect(page.locator('#waf-list-modal-entries'))
			.toHaveValue('198.51.100.7\n203.0.113.0/24\n2001:db8::/48')

		await page.locator('#waf-list-modal-entries').fill('198.51.100.7')
		await page.getByRole('button', { name: 'Save' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/wafList.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/wafList.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.name).toBe('office-ips')
		expect(body.entries).toEqual(['198.51.100.7'])
	})

	test('delete confirms then calls wafList.delete', async ({ page }) => {
		await setMocks({
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [sampleWafList] }
			},
			'wafList.delete': { ok: true, result: {} }
		})

		await page.goto('/waf/lists?project=test-project')
		await page.getByRole('button', { name: 'Delete IP list' }).click()
		await page.locator('#app-modal-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/wafList.delete')
		}).toBe(true)

		const delReq = (await getRequestLog()).find((r) => r.path === '/wafList.delete')
		expect(JSON.parse(delReq?.body ?? '{}').name).toBe('office-ips')
	})

	test('an in-use delete surfaces the server referent list verbatim', async ({ page }) => {
		const inUse = 'waf list "office-ips" is in use by the waf zone at gke (rules: "office allowlist"; limits: "api limit")'
		await setMocks({
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [{ ...sampleWafList, referencedBy: ['gke'] }] }
			},
			'wafList.delete': { ok: false, error: { message: inUse } }
		})

		await page.goto('/waf/lists?project=test-project')
		await page.getByRole('button', { name: 'Delete IP list' }).click()
		await page.locator('#app-modal-confirm').click()

		await expect(page.getByText(inUse)).toBeVisible()
	})

	test('write affordances are disabled without wafList permissions', async ({ page }) => {
		await setMocks({
			'me.permissions': {
				ok: true,
				// Reads only — waf.* deliberately does NOT imply wafList.* access.
				result: { permissions: ['waf.*', 'wafList.get', 'wafList.list'], admin: false }
			},
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [sampleWafList] }
			}
		})

		await page.goto('/waf/lists?project=test-project')

		const newList = page.getByRole('button', { name: 'New list' })
		await expect(newList).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Edit IP list' })).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Delete IP list' })).toBeDisabled()
	})
})

test.describe('waf condition builder ip list picker', () => {
	test('builds an ipInList condition from the picker and saves it', async ({ page }) => {
		await setMocks({
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [sampleWafList] }
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke')

		// Visual builder starts with no rows — add a blank condition (retry until
		// the row appears; see waf.spec.js for the hydration rationale).
		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()

		await pickSelect(page, 'waf-field', 'Remote IP')
		await pickSelect(page, 'waf-operator', 'in IP list')
		await pickSelect(page, 'waf-list-name', 'office-ips')

		const save = page.getByRole('button', { name: 'Save' })
		await expect(save).toBeEnabled()
		await save.click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/waf.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/waf.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.rules).toHaveLength(1)
		expect(body.rules[0].expression).toBe('ipInList(request.remote_ip, "office-ips")')
	})

	test('an existing ipInList rule round-trips into the visual builder', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					rules: [{
						id: 'rule-list1',
						description: 'office allowlist',
						expression: '!ipInList(request.remote_ip, "office-ips")',
						action: 'block',
						status: 403,
						message: 'Forbidden',
						priority: 0
					}]
				})
			},
			'wafList.list': {
				ok: true,
				result: { project: 'test-project', items: [sampleWafList] }
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke&rule=rule-list1')

		// The macro form is representable, so the Visual tab is active and the
		// picker shows the referenced list.
		await expect(page.getByRole('tab', { name: 'Visual' })).toBeEnabled()
		await expect(page.locator('#waf-list-name')).toContainText('office-ips')
	})

	test('the picker is disabled with a hint when wafList.list is missing', async ({ page }) => {
		await setMocks({
			'me.permissions': {
				ok: true,
				// Full waf.* rule management but no wafList.* grants at all.
				result: { permissions: ['waf.*'], admin: false }
			}
		})

		await page.goto('/waf/edit?project=test-project&location=gke')

		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()

		await pickSelect(page, 'waf-field', 'Remote IP')
		await pickSelect(page, 'waf-operator', 'in IP list')

		// Console permission pre-flight: the picker renders disabled with the
		// missing-permission hint instead of failing the fetch.
		const picker = page.locator('#waf-list-name')
		await expect(picker).toBeDisabled()
		await expect(page.locator('span[title*="wafList.list"]')).toBeVisible()
	})
})

test.describe('waf manage ip list chips', () => {
	test('rules and limits referencing a list show a chip linking to the lists page', async ({ page }) => {
		await setMocks({
			'waf.get': {
				ok: true,
				result: wafZone({
					rules: [{
						id: 'rule-list1',
						description: 'office allowlist',
						expression: 'ipInList(request.remote_ip, "office-ips")',
						action: 'allow',
						priority: 0
					}],
					limits: [{
						id: 'limit-1',
						description: 'api limit',
						key: ['ip'],
						rate: 600,
						window: '1m',
						mode: 'enforce',
						filter: '!ipInList(request.remote_ip, "monitoring")'
					}]
				})
			}
		})

		await page.goto('/waf/manage?project=test-project&location=gke')
		const main = page.locator('.content-wrapper')

		const ruleChip = main.getByRole('link', { name: 'office-ips' })
		await expect(ruleChip).toBeVisible()
		await expect(ruleChip).toHaveAttribute('href', /\/waf\/lists\?project=test-project/)
		await expect(main.getByRole('link', { name: 'monitoring' })).toBeVisible()
	})
})
