import { sequence } from '@sveltejs/kit/hooks'

const cookieOptions = {
	httpOnly: true,
	maxAge: 60 * 60 * 24 * 7,
	sameSite: 'lax',
	path: '/',
	secure: import.meta.env.PROD
}

const cookieRemoveOptions = {
	httpOnly: true,
	maxAge: -1,
	sameSite: 'lax',
	path: '/',
	secure: import.meta.env.PROD
}

async function handleCookie ({ event, resolve }) {
	const { cookies, locals, url } = event

	locals.token = cookies.get('token') || ''
	locals.project = cookies.get('project') || ''
	locals.state = cookies.get('state')

	if (url.pathname.startsWith('/api/')) {
		return resolve(event)
	}

	const resp = await resolve(event)

	if (resp.headers.get('content-type') === 'text/html' || resp.status === 302) {
		cookies.set('token', locals.token, cookieOptions)
		if (locals.state === null) {
			cookies.set('state', locals.state, cookieRemoveOptions)
		} else if (locals.state) {
			cookies.set('state', locals.state, cookieOptions)
		}
	}
	return resp
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
