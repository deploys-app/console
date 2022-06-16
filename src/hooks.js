import { sequence } from '@sveltejs/kit/hooks'
import cookie from 'cookie'
import * as cheerio from 'cheerio/lib/slim'

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
	const { request, locals, url } = event
	const cs = cookie.parse(request.headers.get('cookie') || '')

	locals.token = cs.token || ''
	locals.project = cs.project || ''
	locals.state = cs.state

	if (url.pathname.startsWith('/api/')) {
		return resolve(event)
	}

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

	if (url.pathname.startsWith('/api/')) {
		return resolve(event)
	}

	const project = url.searchParams.get('project')
	if (project && project !== locals.project) {
		locals.project = project
	}

	return resolve(event)
}

async function _generateLinkHeader (resp) {
	const allowPrefix = [
		'https://',
		'/'
	]

	const $ = cheerio.load(await resp.clone().text())
	const headers = []

	const f = (p, as) => (_, el) => {
		const src = p($(el)) || ''
		if (!allowPrefix.some((prefix) => src.startsWith(prefix))) {
			return
		}
		headers.push(`<${src}>; rel="preload"; as="${as}"`)
	}

	$('link[rel="stylesheet"]').each(f(($) => $.attr('href'), 'style'))
	$('link[rel="modulepreload"]').each(f(($) => $.attr('href'), 'script'))
	$('img').each(f(($) => $.attr('src'), 'image'))

	return headers.join(', ')
}

async function injectLinkHeader ({ event, resolve }) {
	const resp = await resolve(event)
	const ct = resp.headers.get('content-type') || ''
	if (ct.startsWith('text/html')) {
		const v = await _generateLinkHeader(resp)
		if (v) {
			resp.headers.set('link', v)
		}
	}
	return resp
}

export const handle = sequence(
	injectLinkHeader,
	handleCookie,
	storeProject
)
