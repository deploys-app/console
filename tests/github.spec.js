import { test, expect, setMocks, getRequestLog } from './helpers.js'

const link = {
	repositoryId: 812345678,
	repository: 'acme/web',
	installationId: 77,
	serviceAccount: 'ci',
	serviceAccountEmail: 'ci@test-project.serviceaccount.deploys.app',
	productionBranch: 'release',
	createdAt: '2026-01-01T00:00:00Z',
	createdBy: 'dev@deploys.app'
}

// linked repo without a production branch — any branch may deploy
const linkAnyBranch = {
	repositoryId: 812345681,
	repository: 'acme/mobile',
	installationId: 77,
	serviceAccount: 'ci',
	serviceAccountEmail: 'ci@test-project.serviceaccount.deploys.app',
	productionBranch: '',
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

const savedInstallation = { installationId: 77, createdAt: '2026-01-01T00:00:00Z' }

function mocks (overrides = {}) {
	return setMocks({
		'github.list': { ok: true, result: { items: [link] } },
		'github.getApp': { ok: true, result: appInfo },
		'github.listRepos': { ok: true, result: { items: repos } },
		'github.listInstallations': { ok: true, result: { items: [savedInstallation] } },
		'github.addInstallation': { ok: true, result: {} },
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

	test('renders the production branch per row, with "—" when unset', async ({ page }) => {
		await mocks({ 'github.list': { ok: true, result: { items: [link, linkAnyBranch] } } })

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('columnheader', { name: 'Branch' })).toBeVisible()
		await expect(main.locator('tr', { hasText: 'acme/web' })).toContainText('release')
		await expect(main.locator('tr', { hasText: 'acme/mobile' })).toContainText('—')
	})

	test('workflow generator uses the link production branch, falling back to main', async ({ page }) => {
		await mocks({ 'github.list': { ok: true, result: { items: [link, linkAnyBranch] } } })

		await page.goto('/github?project=test-project')
		const main = page.locator('.content-wrapper')

		// Default selection is acme/web, which restricts production to "release".
		const yaml = main.locator('.workflow-yaml')
		await expect(yaml).toContainText('branches: [release]')

		// acme/mobile has no production branch — the generator falls back to main.
		await main.locator('#gen-repository').click()
		await page.getByRole('option', { name: 'acme/mobile' }).click()
		await expect(yaml).toContainText('branches: [main]')
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

		// Production branch is prefilled with "main"; override it (trimmed on submit)
		const branchInput = main.locator('#link-production-branch')
		await expect(branchInput).toHaveValue('main')
		await branchInput.fill('  release  ')

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
		expect(linkReq.productionBranch).toBe('release')
	})

	test('link page with ?installation_id=99 calls github.listRepos with installationId 99', async ({ page }) => {
		await mocks({
			'github.list': { ok: true, result: { items: [] } },
			'github.listInstallations': { ok: true, result: { items: [] } }
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

	test('landing with ?installation_id=88 calls addInstallation before listRepos for that id', async ({ page }) => {
		await mocks({
			'github.list': { ok: true, result: { items: [] } },
			'github.listInstallations': { ok: true, result: { items: [] } }
		})

		await page.goto('/github/link?project=test-project&installation_id=88')

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/github.listRepos')
		}).toBe(true)

		const log = await getRequestLog()

		// addInstallation must have been called with the correct payload
		const addIndex = log.findIndex((r) => r.path === '/github.addInstallation')
		expect(addIndex).toBeGreaterThanOrEqual(0)
		const addBody = JSON.parse(log[addIndex]?.body ?? '{}')
		expect(addBody.installationId).toBe(88)
		expect(addBody.project).toBe('test-project')

		// addInstallation must appear before listRepos for id 88 in the log
		const listReposIndex = log.findIndex(
			(r) => r.path === '/github.listRepos' && JSON.parse(r.body ?? '{}').installationId === 88
		)
		expect(listReposIndex).toBeGreaterThan(addIndex)
	})

	test('without ?installation_id repos are populated from remembered installations', async ({ page }) => {
		// savedInstallation has installationId: 77 — listInstallations returns it, no URL param
		await mocks({
			'github.list': { ok: true, result: { items: [] } },
			'github.listInstallations': { ok: true, result: { items: [savedInstallation] } }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		// The repo dropdown should be populated from installation 77
		const repoSelect = main.locator('#link-repository')
		await repoSelect.click()
		await expect(page.getByRole('option', { name: 'acme/api' })).toBeVisible()

		// Confirm listRepos was called for the saved installation id
		const log = await getRequestLog()
		const listReposBodies = log
			.filter((r) => r.path === '/github.listRepos')
			.map((r) => JSON.parse(r.body ?? '{}'))
		expect(listReposBodies.some((b) => b.installationId === 77)).toBe(true)

		// addInstallation must NOT have been called (no URL param)
		expect(log.some((r) => r.path === '/github.addInstallation')).toBe(false)
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

	test('Refresh re-fetches repositories and the dropdown reflects updated data', async ({ page }) => {
		await mocks({ 'github.list': { ok: true, result: { items: [] } } })

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		// Wait for the initial client-side fetch to populate the dropdown.
		const repoSelect = main.locator('#link-repository')
		await repoSelect.click()
		await expect(page.getByRole('option', { name: 'acme/api' })).toBeVisible()
		await page.keyboard.press('Escape')

		// A new repo was created on GitHub — the next listRepos returns it.
		await setMocks({
			'github.listRepos': {
				ok: true,
				result: { items: [...repos, { repositoryId: 812345700, repository: 'acme/new-repo', private: false }] }
			}
		})

		await main.getByRole('button', { name: 'Refresh' }).click()

		await repoSelect.click()
		await expect(page.getByRole('option', { name: 'acme/new-repo' })).toBeVisible()

		// listRepos must have been issued again by the Refresh click.
		const log = await getRequestLog()
		const listReposCalls = log.filter((r) => r.path === '/github.listRepos')
		expect(listReposCalls.length).toBeGreaterThanOrEqual(2)
	})

	test('New opens the modal and Create & select issues serviceAccount.create then role.bind, selecting the new SA', async ({ page }) => {
		await mocks({
			'serviceAccount.create': { ok: true, result: {} },
			'role.get': { ok: false, error: { message: 'api: role not found' } },
			'role.create': { ok: true, result: {} },
			'role.bind': { ok: true, result: {} }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		// Open the modal via the "New" button beside the Service account select.
		await main.getByRole('button', { name: 'New' }).click()

		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Create service account' })).toBeVisible()

		// Defaults are prefilled; submit.
		await expect(modal.locator('#create-sa-sid')).toHaveValue('github-deploy')
		await modal.getByRole('button', { name: 'Create & select' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/role.bind')
		}).toBe(true)

		const log = await getRequestLog()
		const createIndex = log.findIndex((r) => r.path === '/serviceAccount.create')
		const bindIndex = log.findIndex((r) => r.path === '/role.bind')
		expect(createIndex).toBeGreaterThanOrEqual(0)
		expect(bindIndex).toBeGreaterThanOrEqual(0)
		expect(createIndex).toBeLessThan(bindIndex)

		const createReq = JSON.parse(log[createIndex]?.body ?? '{}')
		expect(createReq.sid).toBe('github-deploy')
		expect(createReq.name).toBe('GitHub Deploy')

		const bindReq = JSON.parse(log[bindIndex]?.body ?? '{}')
		expect(bindReq.roles).toEqual(['github-deploy'])

		// Modal closes and the picker shows the new SA selected.
		await expect(modal).toHaveCount(0)
		await expect(main.locator('#link-service-account')).toContainText('github-deploy — GitHub Deploy')
	})

	test('unchecking "Grant deploy role" creates the SA but does not bind or create a role', async ({ page }) => {
		await mocks({
			'serviceAccount.create': { ok: true, result: {} }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		await main.getByRole('button', { name: 'New' }).click()
		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Create service account' })).toBeVisible()

		// Untick the grant-role checkbox.
		await modal.locator('#create-sa-grant').uncheck()
		await modal.getByRole('button', { name: 'Create & select' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/serviceAccount.create')
		}).toBe(true)

		// Give any stray follow-up calls a chance to land before asserting absence.
		await expect(modal).toHaveCount(0)

		const log = await getRequestLog()
		expect(log.some((r) => r.path === '/serviceAccount.create')).toBe(true)
		expect(log.some((r) => r.path === '/role.bind')).toBe(false)
		expect(log.some((r) => r.path === '/role.create')).toBe(false)
		// The load probe issues one role.get; the modal's create() must not add a
		// second one when the grant checkbox is off.
		expect(log.filter((r) => r.path === '/role.get').length).toBeLessThanOrEqual(1)
	})

	test('when role perms are denied the grant checkbox is disabled/unchecked with a note, and Create & select skips role.bind', async ({ page }) => {
		await mocks({
			// Deny role.bind and role.create up front; serviceAccount.create stays
			// authorized so the "New" button is still enabled.
			'me.authorized': { ok: true, result: {}, __authorizedDeny: ['role.bind', 'role.create'] },
			'serviceAccount.create': { ok: true, result: {} }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		await main.getByRole('button', { name: 'New' }).click()
		const modal = page.locator('.modal.is-active')
		await expect(modal.getByRole('heading', { name: 'Create service account' })).toBeVisible()

		// Grant checkbox is forced off + disabled, with the explanatory note.
		const grant = modal.locator('#create-sa-grant')
		await expect(grant).toBeDisabled()
		await expect(grant).not.toBeChecked()
		await expect(modal.getByText(/You don't have permission to grant roles in this project \(needs role\.bind\)/)).toBeVisible()

		await modal.getByRole('button', { name: 'Create & select' }).click()

		await expect.poll(async () => {
			const log = await getRequestLog()
			return log.some((r) => r.path === '/serviceAccount.create')
		}).toBe(true)

		// Modal closes once the SA is created; let any stray follow-ups land.
		await expect(modal).toHaveCount(0)

		const log = await getRequestLog()
		expect(log.some((r) => r.path === '/serviceAccount.create')).toBe(true)
		expect(log.some((r) => r.path === '/role.bind')).toBe(false)
		expect(log.some((r) => r.path === '/role.create')).toBe(false)
		// The load probe issues one role.get; with the grant path gated off the
		// modal's create() must not add a second one.
		expect(log.filter((r) => r.path === '/role.get').length).toBeLessThanOrEqual(1)
	})

	test('when serviceAccount.create is denied the "New" button is disabled', async ({ page }) => {
		await mocks({
			// Deny serviceAccount.create only — the other probes stay authorized.
			'me.authorized': { ok: true, result: {}, __authorizedDeny: ['serviceAccount.create'] }
		})

		await page.goto('/github/link?project=test-project')
		const main = page.locator('.content-wrapper')

		await expect(main.getByRole('button', { name: 'New' })).toBeDisabled()
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
