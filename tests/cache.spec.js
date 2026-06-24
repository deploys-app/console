import { test, expect, setMocks, getRequestLog } from './helpers.js'
import { defaultLocation, sampleDomain } from './fixtures/mocks.js'

// A cache-capable location (the default fixture location has no `cache` feature).
const cacheLocation = { ...defaultLocation, id: 'gke', features: { cache: true } }

/** Build a cache zone fixture. */
function cacheZone (overrides = {}) {
	return {
		project: 'test-project',
		location: 'gke',
		description: '',
		overrides: [],
		status: 'success',
		action: 'create',
		createdAt: '2024-01-01T00:00:00Z',
		createdBy: '[email protected]',
		...overrides
	}
}

/** Build a cache override fixture. */
function cacheOverride (overrides = {}) {
	return {
		id: 'override-aaaaaa',
		description: '',
		action: 'cache',
		filter: "request.path.startsWith('/static/')",
		ttl: '1h',
		policy: 'balanced',
		mode: 'enforce',
		priority: 0,
		...overrides
	}
}

test.describe('cache list', () => {
	test('renders zones with status and links to manage', async ({ page }) => {
		await setMocks({
			'cache.list': {
				ok: true,
				result: {
					project: 'test-project',
					items: [
						cacheZone({ location: 'gke', description: 'prod edge', status: 'success', overrides: [cacheOverride()] }),
						cacheZone({ location: 'sgp', status: 'pending', action: 'create', overrides: [] })
					]
				}
			},
			// The list fetches metrics per zone client-side; keep it quiet/empty.
			'cache.metrics': { ok: true, result: { series: [], total: 0 } }
		})

		await page.goto('/cache?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Cache', exact: true })).toBeVisible()
		await expect(main.getByRole('link', { name: 'gke', exact: true })).toBeVisible()
		await expect(main.getByRole('link', { name: 'sgp', exact: true })).toBeVisible()
		await expect(main.getByText('prod edge')).toBeVisible()
		// Settled zone shows Active; the in-flight create shows Deploying.
		await expect(main.getByText('Active')).toBeVisible()
		await expect(main.getByText('Deploying')).toBeVisible()
		// Manage shortcut points at the per-location manage page.
		await expect(main.getByRole('link', { name: 'Manage' }).first())
			.toHaveAttribute('href', /\/cache\/manage\?project=test-project&location=gke/)
	})

	test('shows the empty state when there are no zones', async ({ page }) => {
		await setMocks({
			'cache.list': { ok: true, result: { project: 'test-project', items: [] } }
		})

		await page.goto('/cache?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No cache zones yet')).toBeVisible()
		await expect(main.getByText('Configure cache to start overriding edge caching in a location.')).toBeVisible()
	})

	// Regression: switching project is a same-route SPA navigation (goto to
	// /cache?project=…) that REUSES this page component, so onMount never re-runs.
	// The performance chart + per-zone sparklines, fetched client-side, must
	// refetch for the new project — they used to keep the previous project's data.
	test('refetches the chart + sparklines on project switch', async ({ page }) => {
		const twoProjects = [
			{ id: 'p1', project: 'project-a', name: 'Project A' },
			{ id: 'p2', project: 'project-b', name: 'Project B' }
		]
		await setMocks({
			'project.list': { ok: true, result: { items: twoProjects } },
			'cache.list': { ok: true, result: { project: 'project-a', items: [cacheZone({ location: 'gke' })] } },
			'cache.metrics': { ok: true, result: { series: [], total: 0 } },
			'cache.resultMetrics': { ok: true, result: { series: [] } }
		})

		await page.goto('/cache?project=project-a')

		const calls = async (fn, project) => (await getRequestLog())
			.filter((r) => r.path === fn && JSON.parse(r.body ?? '{}').project === project).length

		// Initial load fetches both client-side series for project-a.
		await expect.poll(() => calls('/cache.resultMetrics', 'project-a')).toBeGreaterThan(0)
		await expect.poll(() => calls('/cache.metrics', 'project-a')).toBeGreaterThan(0)

		// Switch project through the sidebar modal — same-route SPA nav.
		await page.locator('.project-box').click()
		await page.locator('.modal.is-active').getByRole('link', { name: 'Project B' }).click()
		await expect(page).toHaveURL(/project=project-b/)

		// Both client-side fetches must re-issue for project-b (the bug: they didn't).
		await expect.poll(() => calls('/cache.resultMetrics', 'project-b')).toBeGreaterThan(0)
		await expect.poll(() => calls('/cache.metrics', 'project-b')).toBeGreaterThan(0)
	})
})

test.describe('cache create', () => {
	test('offers only unconfigured cache locations and saves an empty zone', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [cacheLocation] } }
			// cache.get is unmocked → 404 (notFound) → the location is unconfigured/available.
		})

		await page.goto('/cache/create?project=test-project')

		// Select the available location via the custom Select.
		await page.locator('#input-location').click()
		await page.getByRole('option', { name: 'gke' }).click()
		await page.locator('#input-description').fill('edge cache')

		await page.getByRole('button', { name: 'Save' }).click()

		// The page persists the new zone via cache.set with an empty override list.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/cache.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/cache.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.location).toBe('gke')
		expect(body.description).toBe('edge cache')
		expect(body.overrides).toEqual([])
	})

	test('reports when every location already has cache configured', async ({ page }) => {
		await setMocks({
			'location.list': { ok: true, result: { items: [cacheLocation] } },
			// The only supported location already has a zone → nothing to create.
			'cache.get': { ok: true, result: cacheZone({ location: 'gke' }) }
		})

		await page.goto('/cache/create?project=test-project')
		await expect(page.getByText('Every location already has cache configured')).toBeVisible()
	})
})

test.describe('cache manage', () => {
	test('lists the zone overrides with action badges', async ({ page }) => {
		await setMocks({
			'cache.get': {
				ok: true,
				result: cacheZone({
					location: 'gke',
					description: 'prod edge',
					overrides: [
						cacheOverride({ id: 'override-static', description: 'cache assets', action: 'cache', ttl: '1h', policy: 'balanced', priority: 0 }),
						cacheOverride({ id: 'override-admin', description: 'skip admin', action: 'bypass', filter: "request.path.startsWith('/admin')", priority: 1 })
					]
				})
			}
		})

		await page.goto('/cache/manage?project=test-project&location=gke')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('heading', { name: 'Cache overrides' })).toBeVisible()
		await expect(main.getByText('override-static')).toBeVisible()
		await expect(main.getByText('cache assets')).toBeVisible()
		await expect(main.getByText('skip admin')).toBeVisible()
		// Each override shows an action badge. "Cache"/"Bypass" also appear in the
		// breadcrumb and behavior summary, so target the badge element directly.
		await expect(main.locator('.action-badge[data-action="cache"]')).toBeVisible()
		await expect(main.locator('.action-badge[data-action="bypass"]')).toBeVisible()
	})

	test('disable cache confirms then calls cache.delete', async ({ page }) => {
		await setMocks({
			'cache.get': { ok: true, result: cacheZone({ location: 'gke', overrides: [cacheOverride()] }) },
			'cache.delete': { ok: true, result: true },
			'cache.list': { ok: true, result: { project: 'test-project', items: [] } }
		})

		await page.goto('/cache/manage?project=test-project&location=gke')

		await page.getByRole('button', { name: 'Disable cache' }).click()
		// Confirm in the SweetAlert dialog.
		await page.locator('.swal2-confirm').click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/cache.delete')
		}).toBe(true)

		const delReq = (await getRequestLog()).find((r) => r.path === '/cache.delete')
		expect(JSON.parse(delReq?.body ?? '{}').location).toBe('gke')
	})
})

test.describe('cache override editor', () => {
	test('builds a cache override and saves it as a whole-zone replace', async ({ page }) => {
		await setMocks({
			// New override editor: empty zone (no overrides configured yet).
			'cache.get': { ok: true, result: cacheZone({ location: 'gke', overrides: [] }) }
		})

		await page.goto('/cache/edit?project=test-project&location=gke')

		// Build a filter via the visual condition builder.
		const addCondition = page.getByRole('button', { name: 'Add condition' })
		const value = page.locator('#waf-value')
		await expect(async () => {
			await addCondition.click()
			await expect(value).toBeVisible({ timeout: 1000 })
		}).toPass()
		await value.fill('/static/app.js')

		// Action defaults to Cache; ttl defaults to 1h. Save the override.
		const save = page.getByRole('button', { name: 'Save' })
		await expect(save).toBeEnabled()
		await save.click()

		// The whole zone is written via cache.set; the new override carries the
		// generated CEL filter and a cache action with a ttl.
		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/cache.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/cache.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.location).toBe('gke')
		expect(body.overrides).toHaveLength(1)
		expect(body.overrides[0].action).toBe('cache')
		expect(body.overrides[0].ttl).toBe('1h')
		expect(body.overrides[0].filter).toBe('request.path == "/static/app.js"')
	})

	test('bypass override omits ttl/policy on save', async ({ page }) => {
		await setMocks({
			'cache.get': {
				ok: true,
				result: cacheZone({
					location: 'gke',
					overrides: [cacheOverride({ id: 'override-bp', action: 'bypass', filter: "request.path.startsWith('/admin')", priority: 0 })]
				})
			}
		})

		await page.goto('/cache/edit?project=test-project&location=gke&override=override-bp')

		const save = page.getByRole('button', { name: 'Save' })
		await expect(save).toBeEnabled()
		await save.click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/cache.set')
		}).toBe(true)

		const setReq = (await getRequestLog()).find((r) => r.path === '/cache.set')
		const body = JSON.parse(setReq?.body ?? '{}')
		expect(body.overrides).toHaveLength(1)
		expect(body.overrides[0].action).toBe('bypass')
		// The API rejects ttl/policy/status/stale_* on a bypass override, so they
		// must be omitted from the payload.
		expect(body.overrides[0].ttl).toBeUndefined()
		expect(body.overrides[0].policy).toBeUndefined()
	})
})

test.describe('cache purge', () => {
	// The cache page renders fine with no zones; purge is driven entirely by the
	// project's domains, fetched lazily when the modal opens.
	const baseMocks = {
		'cache.list': { ok: true, result: { project: 'test-project', items: [] } },
		'cache.resultMetrics': { ok: true, result: { series: [] } }
	}

	test('purges everything for the preselected domain', async ({ page }) => {
		await setMocks({
			...baseMocks,
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'domain.purgeCache': { ok: true, result: {} }
		})

		await page.goto('/cache?project=test-project')
		await page.getByRole('button', { name: 'Purge cache' }).click()

		// The modal loads domains and preselects the first purgeable one, so
		// "Everything" is a one-click purge.
		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Purge cache' })).toBeVisible()
		await modal.getByRole('button', { name: 'Purge', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/domain.purgeCache')
		}).toBe(true)

		const req = (await getRequestLog()).find((r) => r.path === '/domain.purgeCache')
		const body = JSON.parse(req?.body ?? '{}')
		expect(body.domain).toBe('example.com')
		// "Everything" sends neither file nor prefix.
		expect(body.file).toBeUndefined()
		expect(body.prefix).toBeUndefined()
	})

	test('purges a path prefix', async ({ page }) => {
		await setMocks({
			...baseMocks,
			'domain.list': { ok: true, result: { items: [sampleDomain] } },
			'domain.purgeCache': { ok: true, result: {} }
		})

		await page.goto('/cache?project=test-project')
		await page.getByRole('button', { name: 'Purge cache' }).click()

		const modal = page.locator('.modal.is-active')
		await modal.getByRole('button', { name: 'Path prefix' }).click()
		await modal.locator('#purge-path').fill('/static/')
		await modal.getByRole('button', { name: 'Purge', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/domain.purgeCache')
		}).toBe(true)

		const req = (await getRequestLog()).find((r) => r.path === '/domain.purgeCache')
		const body = JSON.parse(req?.body ?? '{}')
		expect(body.domain).toBe('example.com')
		expect(body.prefix).toBe('/static/')
		expect(body.file).toBeUndefined()
	})

	test('excludes wildcard domains and shows the empty state', async ({ page }) => {
		await setMocks({
			...baseMocks,
			// Only a wildcard domain exists — the edge purge can't target it.
			'domain.list': { ok: true, result: { items: [{ ...sampleDomain, domain: '*.example.com', wildcard: true }] } }
		})

		await page.goto('/cache?project=test-project')
		await page.getByRole('button', { name: 'Purge cache' }).click()

		const modal = page.locator('.modal.is-active')
		await expect(modal.getByText('No purgeable domains.')).toBeVisible()
		await expect(modal.getByRole('button', { name: 'Purge', exact: true })).toHaveCount(0)
	})
})
