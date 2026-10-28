import { test as unit, expect as unitExpect } from '@playwright/test'
import { test, expect, setMocks, pickSelect, getRequestLog } from './helpers.js'
import { sampleDeployment } from './fixtures/mocks.js'
import { sameProjectRegistryImage } from '../src/lib/registry-image.js'

const PULL_EMAIL = 'registry-pull@test-project.serviceaccount.deploys.app'
const OLDER_SECRET = 'older-pull-key-secret'
const NEWER_SECRET = 'newer-pull-key-secret'
const REGISTRY_PULL_HELPER = 'For a private registry. New creates a registry-pull service account (registry.pull only) and a pull secret for registry.deploys.app in this location.'

const PROVISION = [
	'serviceaccount.create',
	'serviceaccount.key.create',
	'pullsecret.create',
	'role.bind',
	'role.create'
]

function permissions (names) {
	return {
		'me.permissions': { ok: true, result: { permissions: names, admin: false } }
	}
}

function roleNotFound () {
	return { 'role.get': { ok: false, error: { message: 'api: role not found' } } }
}

function roleNamed (role) {
	return {
		'role.get': {
			ok: true,
			result: {
				role,
				name: role,
				permissions: ['registry.pull'],
				createdAt: '2024-01-01T00:00:00Z',
				createdBy: 'owner@example.com'
			}
		}
	}
}

function serviceAccountWithKeys () {
	return {
		'serviceAccount.get': {
			ok: true,
			result: {
				sid: 'registry-pull',
				email: PULL_EMAIL,
				name: 'Registry Pull',
				description: '',
				createdAt: '2024-01-01T00:00:00Z',
				createdBy: 'owner@example.com',
				keys: [
					{ secret: OLDER_SECRET, createdAt: '2024-01-01T00:00:00Z' },
					{ secret: NEWER_SECRET, createdAt: '2024-06-01T00:00:00Z' }
				]
			}
		}
	}
}

function provisionOk () {
	return {
		...serviceAccountWithKeys(),
		...roleNotFound(),
		'serviceAccount.create': { ok: true, result: {} },
		'role.create': { ok: true, result: {} },
		'role.bind': { ok: true, result: {} },
		'pullSecret.create': { ok: true, result: {} }
	}
}

function pullSecretItem (name, location = 'gke') {
	return {
		name,
		value: '',
		spec: { server: 'https://registry.deploys.app', username: 'x', password: '' },
		location,
		action: 'create',
		status: 'success',
		createdAt: '2024-01-01T00:00:00Z',
		createdBy: 'owner@example.com'
	}
}

function calls (log, path) {
	return log.filter((entry) => entry.path === `/${path}`).map((entry) => JSON.parse(entry.body))
}

unit.describe('sameProjectRegistryImage', () => {
	unit('matches a same-project repository, including nested names, a port, and a digest', () => {
		unitExpect(sameProjectRegistryImage('registry.deploys.app/acme/team/web:v1', 'acme')).toBe(true)
		unitExpect(sameProjectRegistryImage('registry.deploys.app/test-project/web:v1', 'test-project')).toBe(true)
		unitExpect(sameProjectRegistryImage('registry.deploys.app:5000/acme/web', 'acme')).toBe(true)
		unitExpect(sameProjectRegistryImage('registry.deploys.app/acme/web@sha256:abc', 'acme')).toBe(true)
		unitExpect(sameProjectRegistryImage('registry.deploys.app/acme/web:v1@sha256:abc', 'acme')).toBe(true)
	})

	unit('rejects other hosts, other projects, docker hub names, and a namespace with no repository', () => {
		unitExpect(sameProjectRegistryImage('nginx:latest', 'acme')).toBe(false)
		unitExpect(sameProjectRegistryImage('ghcr.io/acme/web:v1', 'acme')).toBe(false)
		unitExpect(sameProjectRegistryImage('registry.deploys.app/other/web:v1', 'acme')).toBe(false)
		unitExpect(sameProjectRegistryImage('acme/web:v1', 'acme')).toBe(false)
		unitExpect(sameProjectRegistryImage('registry.deploys.app/acme', 'acme')).toBe(false)
		unitExpect(sameProjectRegistryImage('registry.deploys.app:443/acme', 'acme')).toBe(false)
	})
})

test.describe('deploy form — registry pull secret', () => {
	test('the pull secret field stays hidden until a location is selected, then New is enabled', async ({ page }) => {
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await expect(main.getByText('Pull Secret', { exact: true })).toHaveCount(0)
		await expect(main.getByRole('button', { name: 'New' })).toHaveCount(0)

		await pickSelect(page, 'input-location', 'gke')
		await expect(main.getByText('Pull Secret', { exact: true })).toBeVisible()
		await expect(main.getByRole('button', { name: 'New' })).toBeEnabled()
		await expect(main.getByText(REGISTRY_PULL_HELPER)).toBeVisible()
	})

	test('New is disabled when pullsecret.create is missing, with that deny tooltip', async ({ page }) => {
		await setMocks({
			...permissions(PROVISION.filter((name) => name !== 'pullsecret.create')),
			...roleNotFound()
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		const button = main.getByRole('button', { name: 'New' })
		await expect(button).toBeDisabled()
		await expect(page.locator('span.inline-flex', { has: page.getByRole('button', { name: 'New' }) })).toHaveAttribute(
			'title',
			"You don't have permission to do this (requires pullsecret.create)."
		)
	})

	test('New is enabled when the registry-pull role is missing and the caller can create it', async ({ page }) => {
		await setMocks({
			...permissions(PROVISION),
			...roleNotFound()
		})
		await page.goto('/deployment/deploy?project=test-project')
		await pickSelect(page, 'input-location', 'gke')
		await expect(page.locator('.content-wrapper').getByRole('button', { name: 'New' })).toBeEnabled()
	})

	test('New is disabled when the role is missing and role.create is absent', async ({ page }) => {
		await setMocks({
			...permissions(PROVISION.filter((name) => name !== 'role.create')),
			...roleNotFound()
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		const button = main.getByRole('button', { name: 'New' })
		await expect(button).toBeDisabled()
		await expect(page.locator('span.inline-flex', { has: page.getByRole('button', { name: 'New' }) })).toHaveAttribute(
			'title',
			"You don't have permission to do this (requires role.create)."
		)
	})

	test('an ok role.get for a different role does not count as registry-pull existing', async ({ page }) => {
		await setMocks({
			...permissions(PROVISION.filter((name) => name !== 'role.create')),
			...roleNamed('viewer')
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		const button = main.getByRole('button', { name: 'New' })
		await expect(button).toBeDisabled()
		await expect(page.locator('span.inline-flex', { has: page.getByRole('button', { name: 'New' }) })).toHaveAttribute(
			'title',
			"You don't have permission to do this (requires role.create)."
		)
	})

	test('New stays enabled without role.create when the registry-pull role already exists', async ({ page }) => {
		await setMocks({
			...permissions(PROVISION.filter((name) => name !== 'role.create')),
			...roleNamed('registry-pull')
		})
		await page.goto('/deployment/deploy?project=test-project')
		await pickSelect(page, 'input-location', 'gke')
		await expect(page.locator('.content-wrapper').getByRole('button', { name: 'New' })).toBeEnabled()
	})

	test('New creates the account, role, and pull secret, then selects registry-pull', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'pullSecret.list': { ok: true, result: { items: [] } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')

		const log = await getRequestLog()
		const saCreate = calls(log, 'serviceAccount.create')
		expect(saCreate).toEqual([
			{ project: 'test-project', sid: 'registry-pull', name: 'Registry Pull' }
		])
		expect(calls(log, 'role.create')).toEqual([
			{
				project: 'test-project',
				role: 'registry-pull',
				name: 'Registry Pull',
				permissions: ['registry.pull']
			}
		])
		expect(calls(log, 'role.bind')).toEqual([
			{ project: 'test-project', email: PULL_EMAIL, roles: ['registry-pull'] }
		])
		expect(calls(log, 'pullSecret.create')).toEqual([
			{
				project: 'test-project',
				location: 'gke',
				name: 'registry-pull',
				spec: {
					server: 'https://registry.deploys.app',
					username: PULL_EMAIL,
					password: NEWER_SECRET
				}
			}
		])
		expect(calls(log, 'serviceAccount.get').some((body) => body.id === 'registry-pull')).toBe(true)
		expect(calls(log, 'serviceAccount.createKey')).toHaveLength(0)
		expect(calls(log, 'role.users')).toHaveLength(0)
		await expect(main.getByRole('button', { name: 'New' })).toHaveCount(0)
		await expect(main.getByText(REGISTRY_PULL_HELPER)).toHaveCount(0)
		await expect(main).not.toContainText(NEWER_SECRET)
		await expect(main).not.toContainText(OLDER_SECRET)
	})

	test('New reuses an existing registry-pull account that is already bound to that role', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: sid not available' } },
			...roleNamed('registry-pull'),
			'role.users': {
				ok: true,
				result: { items: [{ email: PULL_EMAIL, roles: ['registry-pull'] }] }
			}
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')
		await expect(page.locator('#app-modal')).not.toBeVisible()
		const log = await getRequestLog()
		expect(calls(log, 'role.users')).toEqual([{ project: 'test-project' }])
		expect(calls(log, 'role.create')).toHaveLength(0)
		expect(calls(log, 'role.bind')).toEqual([
			{ project: 'test-project', email: PULL_EMAIL, roles: ['registry-pull'] }
		])
		expect(calls(log, 'pullSecret.create')).toEqual([
			{
				project: 'test-project',
				location: 'gke',
				name: 'registry-pull',
				spec: {
					server: 'https://registry.deploys.app',
					username: PULL_EMAIL,
					password: NEWER_SECRET
				}
			}
		])
		await expect(main).not.toContainText(NEWER_SECRET)
		await expect(main.getByText('api: sid not available')).toHaveCount(0)
	})

	test('New binds an existing registry-pull account that has no roles yet', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: sid not available' } },
			'role.users': {
				ok: true,
				result: { items: [{ email: 'other@example.com', roles: ['admin'] }] }
			}
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')
		await expect(page.locator('#app-modal')).not.toBeVisible()
		const log = await getRequestLog()
		expect(calls(log, 'role.create')).toHaveLength(1)
		expect(calls(log, 'role.bind')).toEqual([
			{ project: 'test-project', email: PULL_EMAIL, roles: ['registry-pull'] }
		])
		expect(calls(log, 'pullSecret.create')).toHaveLength(1)
	})

	test('New shows an error modal when the existing account role is not registry.pull only', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: sid not available' } },
			'role.get': {
				ok: true,
				result: {
					role: 'registry-pull',
					name: 'Registry Pull',
					permissions: ['registry.pull', 'deployment.get'],
					createdAt: '2024-01-01T00:00:00Z',
					createdBy: 'owner@example.com'
				}
			},
			'role.users': {
				ok: true,
				result: { items: [{ email: PULL_EMAIL, roles: ['registry-pull'] }] }
			}
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		const dialog = page.locator('#app-modal')
		await expect(dialog).toBeVisible()
		await expect(dialog).toContainText('its role is not limited to registry.pull')
		const log = await getRequestLog()
		expect(calls(log, 'role.bind')).toHaveLength(0)
		expect(calls(log, 'role.create')).toHaveLength(0)
		expect(calls(log, 'pullSecret.create')).toHaveLength(0)
		await expect(main).not.toContainText(NEWER_SECRET)
	})

	test('New shows an error modal when the existing registry-pull account has another role', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: sid not available' } },
			'role.users': {
				ok: true,
				result: { items: [{ email: PULL_EMAIL, roles: ['admin', 'registry-pull'] }] }
			}
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		const dialog = page.locator('#app-modal')
		await expect(dialog).toBeVisible()
		await expect(dialog).toContainText('The registry-pull service account already exists, but it is bound to admin, registry-pull.')
		await expect(dialog).toContainText("It can't be used for a pull secret without replacing those roles.")
		const log = await getRequestLog()
		expect(calls(log, 'role.bind')).toHaveLength(0)
		expect(calls(log, 'role.create')).toHaveLength(0)
		expect(calls(log, 'pullSecret.create')).toHaveLength(0)
		expect(calls(log, 'serviceAccount.createKey')).toHaveLength(0)
		await expect(main).not.toContainText(NEWER_SECRET)
		await expect(main.getByRole('button', { name: 'New' })).toBeVisible()
	})

	test('New shows an error modal when the existing account roles cannot be read', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: sid not available' } },
			'role.users': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		const dialog = page.locator('#app-modal')
		await expect(dialog).toBeVisible()
		await expect(dialog).toContainText('iam: forbidden')
		const log = await getRequestLog()
		expect(calls(log, 'role.bind')).toHaveLength(0)
		expect(calls(log, 'pullSecret.create')).toHaveLength(0)
		await expect(main).not.toContainText(NEWER_SECRET)
	})

	test('New shows the API error and clears it on the next click', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.create': { ok: false, error: { message: 'api: service account quota exceeded' } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		const button = main.getByRole('button', { name: 'New' })
		await button.click()
		await expect(main.getByText('api: service account quota exceeded')).toBeVisible()
		await expect(main).not.toContainText(NEWER_SECRET)

		await setMocks({ 'serviceAccount.create': { ok: true, result: {} } })
		await button.click()
		await expect(main.getByText('api: service account quota exceeded')).toHaveCount(0)
		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')
	})

	test('New mints a key when the account has none and does not use createKey as the password', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'serviceAccount.get': {
				ok: true,
				result: {
					sid: 'registry-pull',
					email: PULL_EMAIL,
					name: 'Registry Pull',
					description: '',
					createdAt: '2024-01-01T00:00:00Z',
					createdBy: 'owner@example.com',
					keys: []
				}
			},
			'serviceAccount.createKey': { ok: true, result: { secret: 'create-key-must-not-render' } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await main.getByRole('button', { name: 'New' }).click()

		await expect(main.getByText('Could not read the service account key secret.')).toBeVisible()
		const log = await getRequestLog()
		expect(calls(log, 'serviceAccount.createKey')).toHaveLength(1)
		expect(calls(log, 'pullSecret.create')).toHaveLength(0)
		await expect(main).not.toContainText('create-key-must-not-render')
	})

	test('New is hidden when registry-pull is already in the location', async ({ page }) => {
		await setMocks({
			'pullSecret.list': { ok: true, result: { items: [pullSecretItem('registry-pull'), pullSecretItem('ghcr')] } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await expect(page.locator('#input-pull_secret')).toBeVisible()
		await page.locator('#input-pull_secret').click()
		await expect(page.getByRole('option', { name: 'registry-pull', exact: true })).toBeVisible()
		await expect(main.getByRole('button', { name: 'New' })).toHaveCount(0)
		await expect(main.getByText(REGISTRY_PULL_HELPER)).toHaveCount(0)

		const log = await getRequestLog()
		expect(calls(log, 'serviceAccount.create')).toHaveLength(0)
		expect(calls(log, 'pullSecret.create')).toHaveLength(0)
		expect(calls(log, 'role.bind')).toHaveLength(0)
	})

	test('New writes registry-pull into the text field when listing pull secrets is forbidden', async ({ page }) => {
		await setMocks({
			...provisionOk(),
			'pullSecret.list': { ok: false, error: { message: 'iam: forbidden' } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		const main = page.locator('.content-wrapper')
		await pickSelect(page, 'input-location', 'gke')
		await expect(page.locator('#input-pull_secret-text')).toBeVisible()
		await expect(main.getByText(REGISTRY_PULL_HELPER)).toBeVisible()
		await main.getByRole('button', { name: 'New' }).click()
		await expect(page.locator('#input-pull_secret-text')).toHaveValue('registry-pull')
		await expect(main.getByText(REGISTRY_PULL_HELPER)).toHaveCount(0)
		await expect(main).not.toContainText(NEWER_SECRET)
	})

	test('a same-project image preselects registry-pull after the location list loads', async ({ page }) => {
		await setMocks({
			'pullSecret.list': { ok: true, result: { items: [pullSecretItem('registry-pull')] } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		await pickSelect(page, 'input-location', 'gke')
		await page.locator('#input-image').fill('registry.deploys.app/test-project/web:v1')
		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')
	})

	test('a third-party image does not preselect registry-pull', async ({ page }) => {
		await setMocks({
			'pullSecret.list': { ok: true, result: { items: [pullSecretItem('registry-pull')] } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		await pickSelect(page, 'input-location', 'gke')
		await page.locator('#input-image').fill('ghcr.io/acme/web:v1')
		await page.locator('#input-pull_secret').click()
		await expect(page.getByRole('option', { name: 'registry-pull', exact: true })).toBeVisible()
		await expect(page.locator('#input-pull_secret')).toContainText('No Pull Secret')
	})

	test('an existing deployment pull secret is not overwritten when its image matches', async ({ page }) => {
		await setMocks({
			'deployment.get': {
				ok: true,
				result: {
					...sampleDeployment,
					image: 'registry.deploys.app/test-project/web:v1',
					pullSecret: 'ghcr'
				}
			},
			'pullSecret.list': {
				ok: true,
				result: { items: [pullSecretItem('registry-pull'), pullSecretItem('ghcr')] }
			}
		})
		await page.goto('/deployment/deploy?project=test-project&location=gke&name=web')
		await expect(page.locator('#input-pull_secret')).toContainText('ghcr')
		await page.locator('#input-pull_secret').click()
		await expect(page.getByRole('option', { name: 'registry-pull', exact: true })).toBeVisible()
		await expect(page.locator('#input-pull_secret')).toContainText('ghcr')
	})

	test('choosing No Pull Secret after an automatic preselect sticks', async ({ page }) => {
		await setMocks({
			'pullSecret.list': { ok: true, result: { items: [pullSecretItem('registry-pull')] } }
		})
		await page.goto('/deployment/deploy?project=test-project')
		await pickSelect(page, 'input-location', 'gke')
		await page.locator('#input-image').fill('registry.deploys.app/test-project/web:v1')
		await expect(page.locator('#input-pull_secret')).toContainText('registry-pull')

		await pickSelect(page, 'input-pull_secret', 'No Pull Secret')
		await expect(page.locator('#input-pull_secret')).toContainText('No Pull Secret')

		await page.locator('#input-image').fill('registry.deploys.app/test-project/web:v2')
		await expect(page.locator('#input-pull_secret')).toContainText('No Pull Secret')
	})
})
