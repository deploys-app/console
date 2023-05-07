import { derived } from 'svelte/store'
import { navigating, page } from '$app/stores'

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
