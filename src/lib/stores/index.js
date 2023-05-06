import { derived, writable } from 'svelte/store'
import { navigating, page } from '$app/stores'

/** @type {import('svelte/store').Writable<import('$types').Profile>} */
export const profile = writable(null)

/** @type {import('svelte/store').Writable<import('$types').ProjectItem[]>} */
export const projects = writable([])

/** @type {import('svelte/store').Readable<import('$types').ProjectItem>} */
export const project = derived(
	page,
	($page) =>
		$page.url.searchParams.get('project'))

/** @type {import('svelte/store').Readable<boolean>} */
export const loading = derived(
	[page, navigating],
	([$page, $navigating]) => {
		if (!$navigating) {
			return false
		}
		if ($navigating.from?.url.pathname === $navigating.to?.url.pathname) {
			return true
		}
		return $page.url.toString() === $navigating.to?.url.toString()
	})
