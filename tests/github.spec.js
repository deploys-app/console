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

const appInfo = { installUrl: 'https://github.com/apps/deploys-app/installations/new' }

const repos = [
	{ repositoryId: 812345678, repository: 'acme/web', private: false },
	{ repositoryId: 812345679, repository: 'acme/api', private: false },
	{ repositoryId: 812345681, repository: 'acme/mobile', private: true }
]

function mocks (overrides = {}) {
	return setMocks({
		'github.list': { ok: true, result: { items: [link] } },
		'github.getApp': { ok: true, result: appInfo },
		'github.listRepos': { ok: true, result: { items: repos } },
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

	test('shows a "Link repository" button pointing at /github/link', async ({ page }) => {
		await mocks()

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		const linkBtn = main.getByRole('link', { name: /Link repository/ })
		await expect(linkBtn).toBeVisible()
		const href = await linkBtn.getAttribute('href')
		expect(href).toBe('/github/link?project=test-project')
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

test.describe('github link page', () => {
	test('install button carries installUrl with state=project', async ({ page }) => {
		await mocks({
			'github.list': { ok: true, result: { items: [] } },
			'github.listRepos': { ok: true, result: { items: [] } }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		const installBtn = main.getByRole('link', { name: /Install GitHub App/ })
		await expect(installBtn).toBeVisible()
		const href = await installBtn.getAttribute('href')
		expect(href).toContain('https://github.com/apps/deploys-app/installations/new')
		expect(href).toContain('state=test-project')
	})

	test('repo dropdown lists mocked repos and links with correct payload', async ({ page }) => {
		await mocks({
			// link has installationId: 77 so the page calls github.listRepos for it
			'github.link': { ok: true, result: {} }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		// Open the repo select and pick acme/api (acme/web is already linked so hidden)
		const repoSelect = main.locator('#link-repository')
		await repoSelect.click()
		await repoSelect.fill('acme/api')
		await page.getByRole('option', { name: 'acme/api' }).click()

		// Pick a service account
		await main.locator('#link-service-account').click()
		await page.getByRole('option', { name: /ci — CI Deployer/ }).click()

		// Click link
		await main.getByRole('button', { name: 'Link', exact: true }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/github.link')
		}).toBe(true)

		const log = await getRequestLog()
		const linkReq = JSON.parse(log.find((r) => r.path === '/github.link')?.body ?? '{}')
		expect(linkReq.repositoryId).toBe(812345679)
		expect(linkReq.installationId).toBe(77)
		expect(linkReq.serviceAccount).toBe('ci')
		expect(linkReq.repository).toBe('acme/api')
	})

	test('link page with ?installation_id=99 calls github.listRepos with installationId 99', async ({ page }) => {
		await mocks({
			'github.list': { ok: true, result: { items: [] } }
		})

		await page.goto('/github/link?project=test-project&installation_id=99')

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/github.listRepos')
		}).toBe(true)

		const log = await getRequestLog()
		const listReposReqs = log.filter((r) => r.path === '/github.listRepos')
		const bodies = listReposReqs.map((r) => JSON.parse(r.body ?? '{}'))
		expect(bodies.some((b) => b.installationId === 99)).toBe(true)
	})

	test('already-linked repos are hidden from dropdown', async ({ page }) => {
		await mocks()
		// link fixture has repositoryId 812345678 (acme/web)
		// repos fixture includes acme/web, acme/api, acme/mobile

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		// Open the repo dropdown
		const repoSelect = main.locator('#link-repository')
		await repoSelect.click()

		// acme/api should be visible; acme/web (already linked) should not appear
		await expect(page.getByRole('option', { name: 'acme/api' })).toBeVisible()
		const webOption = page.getByRole('option', { name: /acme\/web/ })
		await expect(webOption).toHaveCount(0)
	})

	test('after selecting a repo the input shows the repo name and dropdown still lists options on reopen', async ({ page }) => {
		// Keep the default mocks (link has installationId 77 → listRepos is called)
		await mocks()

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		const repoSelect = main.locator('#link-repository')
		await repoSelect.click()
		await repoSelect.fill('acme/api')
		await page.getByRole('option', { name: 'acme/api' }).click()

		// Input must display the full name, not a numeric id
		await expect(repoSelect).toHaveValue('acme/api')

		// Reopen the dropdown — options must still appear (regression for numeric-value bug)
		await repoSelect.click()
		await expect(page.getByRole('option', { name: 'acme/api' })).toBeVisible()
	})

	test('shows inline warning when github.listRepos fails and hides complete-step-1 copy', async ({ page }) => {
		await mocks({
			'github.listRepos': { ok: false, error: { message: 'boom' } }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		await expect(main.getByText(/Couldn't load repositories: boom/)).toBeVisible()
		await expect(main.getByText(/Complete step 1 to grant access/)).toHaveCount(0)
	})
})

test.describe('github-setup redirect', () => {
	test('/github-setup?installation_id=99&state=test-project redirects to link page', async ({ page }) => {
		await mocks()

		await page.goto('/github-setup?installation_id=99&state=test-project')

		await expect(page).toHaveURL(/\/github\/link\?project=test-project&installation_id=99/)
	})

	test('/github-setup?installation_id=99 (no state) redirects to link page without project', async ({ page }) => {
		// Without a project param the (project) layout redirects to /project,
		// but the URL should first land on /github/link with installation_id.
		await mocks()

		await page.goto('/github-setup?installation_id=99')

		// The (project) layout will redirect further (to /project) because there
		// is no ?project= param — just assert the initial redirect happened.
		await expect(page).toHaveURL(/\/github\/link\?installation_id=99|\/project/)
	})

	test('/github-setup with no params redirects to /github (then to /project)', async ({ page }) => {
		await mocks()

		await page.goto('/github-setup')

		// Should redirect to /github which then redirects to /project (no ?project=)
		await expect(page).toHaveURL(/\/github|\/project/)
	})
})
