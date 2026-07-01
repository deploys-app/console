import { test, expect, setMocks } from './helpers.js'
import { sampleBillingAccount } from './fixtures/mocks.js'

const ownerAccount = { ...sampleBillingAccount, role: 'owner' }
const accountantAccount = { ...sampleBillingAccount, role: 'accountant' }

const memberList = {
	ok: true,
	result: {
		owner: 'owner@example.com',
		items: [
			{ email: 'accountant@example.com', role: 'accountant', createdAt: '2026-06-01T09:00:00Z', createdBy: 'owner@example.com' },
			{ email: 'cfo@example.com', role: 'admin', createdAt: '2026-05-12T10:30:00Z', createdBy: 'owner@example.com' }
		]
	}
}

test.describe('billing members', () => {
	test('owner sees the Members tab and the people-with-access list', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: ownerAccount },
			'billing.listMembers': memberList
		})

		await page.goto('/billing/members?id=ba-1')

		const main = page.locator('.content-wrapper')
		// Portal Members tab present for an owner.
		await expect(main.getByRole('link', { name: 'Members' })).toBeVisible()
		// Owner + both members are listed (exact match: the owner email also appears
		// inside each member's "added by" meta line).
		await expect(main.getByText('owner@example.com', { exact: true })).toBeVisible()
		await expect(main.getByText('accountant@example.com', { exact: true })).toBeVisible()
		await expect(main.getByText('cfo@example.com', { exact: true })).toBeVisible()
		// The invite form is present.
		await expect(main.getByRole('button', { name: 'Invite' })).toBeVisible()
	})

	test('owner can invite a member — calls billing.addMember', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: ownerAccount },
			'billing.listMembers': memberList,
			'billing.addMember': { ok: true, result: {} }
		})

		await page.goto('/billing/members?id=ba-1')

		const main = page.locator('.content-wrapper')
		await main.getByLabel('Email').fill('new.accountant@example.com')
		await main.getByRole('button', { name: 'Invite' }).click()

		// On a successful add the form clears — no error modal, input reset.
		await expect(main.getByLabel('Email')).toHaveValue('')
		await expect(page.locator('#app-modal')).toBeHidden()
	})

	test('accountant does not see the Members tab', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: accountantAccount }
		})

		await page.goto('/billing/detail?id=ba-1')

		const main = page.locator('.content-wrapper')
		await expect(main.getByRole('link', { name: 'Overview' })).toBeVisible()
		// Members management is owner/admin only.
		await expect(main.getByRole('link', { name: 'Members' })).toHaveCount(0)
		// And no Edit / Danger zone affordances.
		await expect(main.getByRole('link', { name: 'Edit' })).toHaveCount(0)
		await expect(main.getByText('Danger zone')).toHaveCount(0)
	})

	test('accountant deep-linking to members is redirected to the overview', async ({ page }) => {
		await setMocks({
			'billing.get': { ok: true, result: accountantAccount }
		})

		await page.goto('/billing/members?id=ba-1')

		await expect(page).toHaveURL(/\/billing\/detail\?id=ba-1/)
	})
})
