import { sequence } from '@sveltejs/kit/hooks'

async function handleCookie ({ event, resolve }) {
	const { cookies, locals } = event

	locals.token = cookies.get('token') || ''
	locals.project = cookies.get('project') || ''

	return resolve(event)
}

function storeProject ({ event, resolve }) {
	const { url, locals } = event

	if (url.pathname.startsWith('/api/')) {
		return resolve(event)
	}

	const project = url.searchParams.get('project')
	if (project && project !== locals.project) {
		locals.project = project
	}

	return resolve(event)
}

export const handle = sequence(
	handleCookie,
	storeProject
)
