// Unit tests for the pure permission helper. permission.js has no SvelteKit or
// browser dependencies, so it imports cleanly into a plain Node-run Playwright
// spec (the repo's only test runner) via a relative path — the $lib alias is
// not resolved here. These cases mirror the server's effective-grant matching.

import { test, expect } from '@playwright/test'
import { hasPermission, denyTooltip } from '../src/lib/permission.js'

test.describe('hasPermission', () => {
	test('admin holds everything', () => {
		expect(hasPermission([], true, 'deployment.deploy')).toBe(true)
		expect(hasPermission(undefined, true, 'anything.at.all')).toBe(true)
	})

	test("the '*' wildcard grants every permission", () => {
		expect(hasPermission(['*'], false, 'deployment.deploy')).toBe(true)
		expect(hasPermission(['*'], false, 'role.bind')).toBe(true)
	})

	test("a '<resource>.*' wildcard grants all actions on that resource", () => {
		expect(hasPermission(['deployment.*'], false, 'deployment.deploy')).toBe(true)
		expect(hasPermission(['deployment.*'], false, 'deployment.delete')).toBe(true)
		// ...but not actions on a different resource
		expect(hasPermission(['deployment.*'], false, 'role.bind')).toBe(false)
	})

	test("a '<resource>.*' wildcard does NOT cover a three-segment permission", () => {
		// Mirrors the server: iam.validPermissions only applies the wildcard for
		// two-segment permissions, so serviceaccount.* does not grant
		// serviceaccount.key.create — only an exact grant or '*' does.
		expect(hasPermission(['serviceaccount.*'], false, 'serviceaccount.key.create')).toBe(false)
		expect(hasPermission(['serviceaccount.key.create'], false, 'serviceaccount.key.create')).toBe(true)
		expect(hasPermission(['*'], false, 'serviceaccount.key.create')).toBe(true)
	})

	test('an exact grant matches', () => {
		expect(hasPermission(['serviceaccount.create'], false, 'serviceaccount.create')).toBe(true)
		expect(hasPermission(['role.bind', 'role.get'], false, 'role.get')).toBe(true)
	})

	test('a missing grant does not match', () => {
		expect(hasPermission(['role.get'], false, 'role.bind')).toBe(false)
		// a prefix that is not a '<resource>.*' wildcard must not match
		expect(hasPermission(['deployment'], false, 'deployment.deploy')).toBe(false)
	})

	test('empty or undefined grants deny everything (non-admin)', () => {
		expect(hasPermission([], false, 'deployment.deploy')).toBe(false)
		expect(hasPermission(undefined, false, 'deployment.deploy')).toBe(false)
	})

	test('a permission with no dot still falls back to an exact match', () => {
		expect(hasPermission(['legacy'], false, 'legacy')).toBe(true)
		expect(hasPermission(['*'], false, 'legacy')).toBe(true)
		expect(hasPermission(['other'], false, 'legacy')).toBe(false)
	})

	test('denyTooltip names the required permission', () => {
		expect(denyTooltip('deployment.deploy')).toBe(
			"You don't have permission to do this (requires deployment.deploy)."
		)
	})
})
