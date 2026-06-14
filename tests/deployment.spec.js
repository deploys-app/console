import { test, expect, setMocks } from './helpers.js'
import {
	defaultLocation,
	sampleCloudSqlProxySidecar,
	sampleDeployment,
	sampleStaticDeployment,
	sampleStaticReleaseSha
} from './fixtures/mocks.js'

test.describe('deployments', () => {
	test('lists deployments', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: true,
				result: {
					items: [
						sampleDeployment,
						{ ...sampleDeployment, name: 'api', type: 'TCPService' }
					]
				}
			}
		})

		await page.goto('/deployment?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Deployments' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'web' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'api' })).toBeVisible()
		await expect(main.getByRole('link', { name: 'Deploy' })).toHaveAttribute(
			'href',
			'/deployment/deploy?project=test-project'
		)
	})

	test('shows empty state when there are no deployments', async ({ page }) => {
		await page.goto('/deployment?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('No deployments yet')).toBeVisible()
	})

	test('shows error row when the deployment.list API fails', async ({ page }) => {
		await setMocks({
			'deployment.list': {
				ok: false,
				error: { message: 'api: internal error' }
			}
		})
		await page.goto('/deployment?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('api: internal error')).toBeVisible()
	})
})

test.describe('deployment detail — sidecars', () => {
	test('hides sidecar row when none are configured', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		// No "Sidecars" spec row should render at all when the deployment has none.
		await expect(page.locator('.spec').filter({ hasText: 'Sidecars' })).toHaveCount(0)
	})

	test('renders each configured sidecar', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					sidecars: [
						sampleCloudSqlProxySidecar,
						{
							cloudSqlProxy: {
								instance: 'my-project:asia-southeast1:replica',
								port: 3307,
								credentials: ''
							}
						}
					]
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		// Sidecars render in a `.spec` row (label + value list), not a table row.
		const row = page.locator('.spec').filter({ hasText: 'Sidecars' })
		await expect(row).toBeVisible()
		await expect(row.getByText('my-project:us-central1:my-db')).toBeVisible()
		await expect(row.getByText(':3306')).toBeVisible()
		await expect(row.getByText('my-project:asia-southeast1:replica')).toBeVisible()
		await expect(row.getByText(':3307')).toBeVisible()
	})
})

test.describe('deployment deploy — sidecars', () => {
	test('add, remove, and cap at two sidecars', async ({ page }) => {
		// Start from an existing deployment with no sidecars so the form is
		// fully hydrated — the new-deployment path requires picking a location
		// from a dropdown, which bind:value won't pick up via selectOption.
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, sidecars: [] }
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Sidecars' })).toBeVisible()

		const addBtn = main.getByRole('button', { name: 'Add Sidecar' })

		await addBtn.click()
		await expect(main.getByText('Sidecar #1')).toBeVisible()

		await addBtn.click()
		await expect(main.getByText('Sidecar #2')).toBeVisible()

		// Capped at 2 — the add button should disappear.
		await expect(addBtn).toHaveCount(0)

		// Remove the first sidecar and the button should reappear.
		await main.getByRole('button', { name: 'Remove sidecar' }).first().click()
		await expect(main.getByText('Sidecar #2')).toHaveCount(0)
		await expect(main.getByRole('button', { name: 'Add Sidecar' })).toBeVisible()
	})

	test('hydrates existing sidecars when editing a revision', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					sidecars: [sampleCloudSqlProxySidecar]
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Sidecar #1')).toBeVisible()
		await expect(main.locator('#input-sidecar-instance-0')).toHaveValue(
			'my-project:us-central1:my-db'
		)
		await expect(main.locator('#input-sidecar-port-0')).toHaveValue('3306')
	})
})

test.describe('deployment detail — env groups', () => {
	test('views attached env group variables in a popup', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config', 'secrets'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.get': {
				ok: true,
				result: {
					project: 'test-project',
					name: 'shared-config',
					env: { LOG_LEVEL: 'info', REGION: 'apac' },
					createdAt: '2024-01-01T00:00:00Z',
					createdBy: '[email protected]'
				}
			}
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()

		await main.getByRole('button', { name: 'shared-config' }).click()

		const dialog = page.locator('.modal-panel')
		await expect(dialog.getByRole('heading', { name: 'shared-config' })).toBeVisible()
		await expect(dialog.getByText('LOG_LEVEL')).toBeVisible()
		await expect(dialog.getByText('info')).toBeVisible()
		await expect(dialog.getByText('REGION')).toBeVisible()
		await expect(dialog.getByText('apac')).toBeVisible()
	})

	test('shows no data when deployment has no env groups', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		const envGroupTable = main.locator('section, div').filter({
			has: page.getByRole('heading', { name: 'Env Groups' })
		})
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()
		await expect(envGroupTable.getByText('Nothing here yet').first()).toBeVisible()
	})
})

test.describe('deployment deploy — env groups', () => {
	test('hydrates existing env groups when editing a revision', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.list': {
				ok: true,
				result: {
					items: [
						{
							project: 'test-project',
							name: 'shared-config',
							env: {},
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						},
						{
							project: 'test-project',
							name: 'secrets',
							env: {},
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						}
					]
				}
			}
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'Env Groups' })).toBeVisible()
		await expect(main.getByRole('cell', { name: 'shared-config' })).toBeVisible()
	})

	test('views env group variables in a popup', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleDeployment, envGroups: ['shared-config'] }
			},
			'location.get': { ok: true, result: defaultLocation },
			'envGroup.list': {
				ok: true,
				result: {
					items: [
						{
							project: 'test-project',
							name: 'shared-config',
							env: { LOG_LEVEL: 'info', REGION: 'apac' },
							createdAt: '2024-01-01T00:00:00Z',
							createdBy: '[email protected]'
						}
					]
				}
			}
		})

		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('cell', { name: 'shared-config' })).toBeVisible()

		await main.getByRole('button', { name: 'View env group' }).click()

		const dialog = page.locator('.modal-panel')
		await expect(dialog.getByRole('heading', { name: 'shared-config' })).toBeVisible()
		await expect(dialog.getByText('LOG_LEVEL')).toBeVisible()
		await expect(dialog.getByText('info')).toBeVisible()
		await expect(dialog.getByText('REGION')).toBeVisible()
		await expect(dialog.getByText('apac')).toBeVisible()
	})
})

test.describe('deployment detail — environment variables', () => {
	test('show all toggle reveals and hides every value', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					env: { SECRET_KEY: 'topsecret-value', API_URL: 'https://example.test' }
				}
			},
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')

		const main = page.locator('.content-wrapper')
		const showAll = main.getByRole('button', { name: 'Show all' })
		await expect(showAll).toBeVisible()
		await expect(main.getByText('topsecret-value')).toBeHidden()
		await expect(main.getByText('https://example.test')).toBeHidden()

		await showAll.click()

		await expect(main.getByText('topsecret-value')).toBeVisible()
		await expect(main.getByText('https://example.test')).toBeVisible()

		const hideAll = main.getByRole('button', { name: 'Hide all' })
		await expect(hideAll).toBeVisible()
		await hideAll.click()

		await expect(main.getByText('topsecret-value')).toBeHidden()
		await expect(main.getByText('https://example.test')).toBeHidden()
	})
})

test.describe('deployment detail — static', () => {
	test('shows the Release (release-sha), not an Image row', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=website')

		const main = page.locator('.content-wrapper')

		// The Runtime section shows a Release row carrying the release-sha; no
		// container Image row is rendered for a Static deployment.
		const release = main.locator('.spec').filter({ hasText: 'Release' })
		await expect(release).toBeVisible()
		await expect(release).toContainText(sampleStaticReleaseSha)
		await expect(main.locator('.spec').filter({ hasText: /^Image/ })).toHaveCount(0)

		// Type renders as Static and the public URL is shown.
		await expect(main.locator('.spec').filter({ hasText: 'Type' })).toContainText('Static')
		await expect(main.getByRole('link', { name: 'https://website.test-project.app.in.th' })).toBeVisible()
	})

	test('status icon shows success without polling for pod readiness', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=website')

		// A successful Static deployment is done immediately — the header icon is
		// the success check, not a readiness spinner.
		await expect(page.locator('.masthead__icon i.fa-check-circle')).toBeVisible()
		await expect(page.locator('.masthead__icon i.fa-spinner')).toHaveCount(0)
	})

	test('hides the Logs and Events tabs', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=website')

		const tabs = page.locator('.tabs')
		await expect(tabs.getByRole('link', { name: 'Metrics' })).toBeVisible()
		await expect(tabs.getByRole('link', { name: 'Details' })).toBeVisible()
		await expect(tabs.getByRole('link', { name: 'Revisions' })).toBeVisible()
		await expect(tabs.getByRole('link', { name: 'Logs' })).toHaveCount(0)
		await expect(tabs.getByRole('link', { name: 'Events' })).toHaveCount(0)
	})

	test('metrics tab hides CPU and Memory but keeps Requests and Egress', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'deployment.metrics': { ok: true, result: {} }
		})

		await page.goto('/deployment/metrics?project=test-project&location=gke&name=website')

		const main = page.locator('.content-wrapper')
		// The static-gateway reports per-site request rate, so Requests applies;
		// CPU/Memory don't (no pods). Egress stays.
		await expect(main.getByText('Request (rps)')).toBeVisible()
		await expect(main.getByText('Egress (bytes)')).toBeVisible()
		await expect(main.getByText('vCPU (second)')).toHaveCount(0)
		await expect(main.getByText('Memory (bytes)')).toHaveCount(0)
	})
})

test.describe('deployment detail — non-static keeps pod surface', () => {
	test('WebService keeps the Logs and Events tabs and the CPU/Memory charts', async ({ page }) => {
		await setMocks({
			'deployment.get': { ok: true, result: sampleDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'deployment.metrics': { ok: true, result: {} }
		})

		await page.goto('/deployment/detail?project=test-project&location=gke&name=web')
		const tabs = page.locator('.tabs')
		await expect(tabs.getByRole('link', { name: 'Logs' })).toBeVisible()
		await expect(tabs.getByRole('link', { name: 'Events' })).toBeVisible()

		await page.goto('/deployment/metrics?project=test-project&location=gke&name=web')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('vCPU (second)')).toBeVisible()
		await expect(main.getByText('Memory (bytes)')).toBeVisible()
	})
})

test.describe('deployment revision — static rollback', () => {
	test('revision list and rollback comparison render release-shas', async ({ page }) => {
		const shaActive = sampleStaticReleaseSha
		const shaPrev = 'b'.repeat(64)

		await setMocks({
			'deployment.get': { ok: true, result: sampleStaticDeployment },
			'location.get': { ok: true, result: defaultLocation },
			'deployment.revisions': {
				ok: true,
				result: {
					items: [
						{ ...sampleStaticDeployment, revision: 2, site: `site://deploys-static/test-project/website@${shaActive}`, siteManifestDigest: shaActive },
						{ ...sampleStaticDeployment, revision: 1, site: `site://deploys-static/test-project/website@${shaPrev}`, siteManifestDigest: shaPrev }
					]
				}
			}
		})

		await page.goto('/deployment/revision?project=test-project&location=gke&name=website')

		const main = page.locator('.content-wrapper')

		// Each revision row renders its release-sha (not an image).
		await expect(main.locator('.rev-row__image').first()).toHaveText(shaActive)
		await expect(main.locator('.rev-row__image').nth(1)).toHaveText(shaPrev)
		await expect(main.getByText(':latest')).toHaveCount(0)

		// The deployment.get for revision 1 (rollback target spec) must return the
		// historical release so the comparison reads sensibly.
		await setMocks({
			'deployment.get': {
				ok: true,
				result: { ...sampleStaticDeployment, revision: 1, site: `site://deploys-static/test-project/website@${shaPrev}`, siteManifestDigest: shaPrev }
			}
		})

		// Open the rollback modal for the older revision.
		await main.getByRole('button', { name: 'Rollback' }).click()

		const modal = page.locator('.modal.is-active')
		await expect(modal).toBeVisible()

		// Comparison cards show release-shas old → new.
		await expect(modal.locator('.rb-side[data-kind="from"] .rb-side__image')).toHaveText(shaActive)
		await expect(modal.locator('.rb-side[data-kind="to"] .rb-side__image')).toHaveText(shaPrev)

		// The static prose reads "re-points the site … release", not "image".
		await expect(modal.getByText(/re-points the site/)).toBeVisible()
	})
})
