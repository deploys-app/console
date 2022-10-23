import { redirect } from '@sveltejs/kit'

export function load ({ url, data }) {
	const pageProject = url.searchParams.get('project')
	const { restoreProject } = data || {}

	if (!pageProject && restoreProject) {
		const q = new URLSearchParams(url.search)
		q.set('project', restoreProject)
		throw redirect(302, `?${q.toString()}`)
	}
	if (!pageProject) {
		throw redirect(302, '/project')
	}

	return {
		project: pageProject
	}
}
