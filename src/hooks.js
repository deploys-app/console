import { sequence } from '@sveltejs/kit/hooks'
import cookie from 'cookie'

export function getSession ({ locals }) {
	return {
		project: locals.project || ''
	}
}

const cookieOptions = {
	httpOnly: true,
	maxAge: 60 * 60 * 24 * 7,
	sameSite: 'lax',
	path: '/',
	secret: import.meta.env.PROD
}

const cookieProjectOptions = {
	maxAge: 60 * 60 * 24 * 7,
	sameSite: 'lax',
	path: '/',
	secret: import.meta.env.PROD
}

const cookieRemoveOptions = {
	httpOnly: true,
	maxAge: -1,
	sameSite: 'lax',
	path: '/',
	secret: import.meta.env.PROD
}

async function handleCookie ({ event, resolve }) {
	const { request, locals } = event
	const cs = cookie.parse(request.headers.get('cookie') || '')

	locals.token = cs.token || ''
	locals.project = cs.project || ''
	locals.state = cs.state

	const resp = await resolve(event)

	resp.headers.append('set-cookie', cookie.serialize('token', locals.token, cookieOptions))
	if (locals.state === null) {
		resp.headers.append('set-cookie', cookie.serialize('state', locals.state, cookieRemoveOptions))
	} else if (locals.state) {
		resp.headers.append('set-cookie', cookie.serialize('state', locals.state, cookieOptions))
	}
	return resp
}

function storeProject ({ event, resolve }) {
	const { url, locals } = event
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
