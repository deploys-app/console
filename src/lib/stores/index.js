import { derived, writable } from 'svelte/store'

export const profile = writable(null)
export const projects = writable([])
export const project = writable(null)
export const projectInfo = derived(
	[projects, project],
	([$projects, $project]) =>
		$projects.find((p) => p.project === $project)
)
