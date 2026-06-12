import { test, expect, setMocks, getRequestLog } from './helpers.js'

const link = {
	repositoryId: 812345678,
	repository: 'acme/web',
	installationId: 77,
	serviceAccount: 'ci',
	serviceAccountEmail: 'ci@test-project.serviceaccount.deploys.app',
	createdAt: '2026-01-01T00:00:00Z',
	createdBy: 'dev@deploys.app'
}

const serviceAccount = {
	sid: 'ci',
	email: 'ci@test-project.serviceaccount.deploys.app',
	name: 'CI Deployer',
	description: '',
	createdAt: '2026-01-01T00:00:00Z',
	createdBy: 'dev@deploys.app'
}

const location = { id: 'gke' }

function mocks (overrides = {}) {
	return setMocks({
		'github.list': { ok: true, result: { items: [link] } },
		'serviceAccount.list': { ok: true, result: { items: [serviceAccount] } },
		'location.list': { ok: true, result: { items: [location] } },
		...overrides
	})
}

test.describe('github', () => {
	test('lists linked repositories and renders the workflow generator', async ({ page }) => {
		await mocks()

		await page.goto('/github?project=test-project')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('heading', { name: 'GitHub' })).toBeVisible()
		await expect(main.getByRole('link', { name: /acme\/web/ })).toBeVisible()
		await expect(main.getByText(link.serviceAccountEmail)).toBeVisible()

		// The generated workflow carries the project and the action pin.
		const yaml = main.locator('.workflow-yaml')
		await expect(yaml).toContainText('uses: deploys-app/build-deploy-action@v1')
		await expect(yaml).toContainText('project: test-project')
		await expect(yaml).toContainText('location: gke')

		// Editing the generator inputs updates the yaml.
		await main.locator('#gen-name').fill('api')
		await expect(yaml).toContainText('name: api')

		// Create-on-GitHub deep-link targets the linked repo's file editor.
		const href = await main.getByRole('link', { name: 'Create on GitHub' }).getAttribute('href')
		expect(href).toContain('https://github.com/acme/web/new/main?filename=.github/workflows/deploy.yml&value=')
		expect(decodeURIComponent(href ?? '')).toContain('name: api')
	})

	test('empty state hides the workflow generator', async ({ page }) => {
		await mocks({ 'github.list': { ok: true, result: { items: [] } } })

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Nothing here yet')).toBeVisible()
		await expect(main.locator('.workflow-yaml')).toHaveCount(0)
	})

	test('links a repository via lookupRepo', async ({ page }) => {
		await mocks({
			'github.list': { ok: true, result: { items: [] } },
			'github.lookupRepo': {
				ok: true,
				result: { repositoryId: 900001, repository: 'acme/api', installationId: 77 }
			},
			'github.link': { ok: true, result: {} }
		})

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		await main.locator('#github-repository').fill('acme/api')
		await main.locator('#github-service-account').click()
		await page.getByRole('option', { name: /ci — CI Deployer/ }).click()
		await main.getByRole('button', { name: 'Link', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/github.link')
		}).toBe(true)

		const log = await getRequestLog()
		const lookup = JSON.parse(log.find((r) => r.path === '/github.lookupRepo')?.body ?? '{}')
		expect(lookup.repository).toBe('acme/api')
		const linkReq = JSON.parse(log.find((r) => r.path === '/github.link')?.body ?? '{}')
		expect(linkReq.repositoryId).toBe(900001)
		expect(linkReq.installationId).toBe(77)
		expect(linkReq.serviceAccount).toBe('ci')
	})

	test('surfaces app-not-installed from lookup', async ({ page }) => {
		await mocks({
			'github.lookupRepo': {
				ok: false,
				error: { message: 'api: github app is not installed on the repository' }
			}
		})

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		await main.locator('#github-repository').fill('acme/private')
		await main.locator('#github-service-account').click()
		await page.getByRole('option', { name: /ci — CI Deployer/ }).click()
		await main.getByRole('button', { name: 'Link', exact: true }).click()

		await expect(page.getByText('github app is not installed')).toBeVisible()
	})

	test('unlinks after confirmation', async ({ page }) => {
		await mocks({ 'github.unlink': { ok: true, result: {} } })

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		await main.getByRole('button', { name: 'Unlink repository' }).click()
		await page.getByRole('button', { name: 'Unlink', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/github.unlink')
		}).toBe(true)

		const req = JSON.parse((await getRequestLog()).find((r) => r.path === '/github.unlink')?.body ?? '{}')
		expect(req.repositoryId).toBe(link.repositoryId)
	})
})
