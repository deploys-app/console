import { derived, writable } from 'svelte/store'
import { page } from '$app/stores'

export const profile = writable(null)
export const projects = writable([])
export const project = derived(
	page,
	($page) =>
		$page.url.searchParams.get('project'))
export const projectInfo = derived(
	[projects, project],
	([$projects, $project]) =>
		$projects.find((p) => p.project === $project))
