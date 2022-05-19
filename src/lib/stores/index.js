import { derived, writable } from 'svelte/store'
import { navigating, page } from '$app/stores'

export const profile = writable(null)

export const projects = writable([])

export const project = derived(
	page,
	($page) =>
		$page.url.searchParams.get('project'))

export const loading = derived(
	[page, navigating],
	([$page, $navigating]) => {
		if (!$navigating) {
			return false
		}
		if ($navigating.from?.pathname === $navigating.to?.pathname) {
			return true
		}
		return $page.url.toString() === $navigating.to?.toString()
	})
