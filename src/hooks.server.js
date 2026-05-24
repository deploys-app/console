import { sequence } from '@sveltejs/kit/hooks'

/** @type {import('@sveltejs/kit').Handle} */
async function theme ({ event, resolve }) {
	// Only force a class for an explicit choice. With no cookie the default is
	// the OS preference, which is unknown server-side — the inline script in
	// app.html applies it before first paint.
	const cls = event.cookies.get('theme') === 'dark' ? 'dark' : ''
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme%', cls)
	})
}

/** @type {import('@sveltejs/kit').Handle} */
async function handleCookie ({ event, resolve }) {
	const { cookies, locals } = event

	locals.token = cookies.get('token') || ''
	locals.project = cookies.get('project') || ''

	return resolve(event)
}

/** @type {import('@sveltejs/kit').Handle} */
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
	theme,
	handleCookie,
	storeProject
)
