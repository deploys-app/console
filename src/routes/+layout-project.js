import { redirect } from '@sveltejs/kit'

export function load ({ session, url }) {
	const pageProject = url.searchParams.get('project')
	const restoreProject = session.project

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
