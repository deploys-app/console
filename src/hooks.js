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

	if (resp.headers.get('content-type') === 'text/html' || resp.status === 302) {
		resp.headers.append('set-cookie', cookie.serialize('token', locals.token, cookieOptions))
		if (locals.state === null) {
			resp.headers.append('set-cookie', cookie.serialize('state', locals.state, cookieRemoveOptions))
		} else if (locals.state) {
			resp.headers.append('set-cookie', cookie.serialize('state', locals.state, cookieOptions))
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

async function _generateLinkHeaders (resp) {
	const allowPrefix = [
		'https://',
		'/'
	]

	const $ = cheerio.load(await resp.clone().text())
	const headers = []

	const f = (p, as, crossorigin) => (_, el) => {
		const $el = $(el)
		const src = p($el) || ''
		if (!allowPrefix.some((prefix) => src.startsWith(prefix))) {
			return
		}
		let h = `<${src}>; rel=preload; as=${as}`
		if (!crossorigin) {
			const crossorigin = $el.attr('crossorigin')
			if (crossorigin != null) {
				h += '; crossorigin'
				if (crossorigin) {
					h += `=${crossorigin}`
				}
			}
		} else {
			h += '; crossorigin'
		}
		headers.push(h)
	}

	$('link[rel="stylesheet"]').each(f(($) => $.attr('href'), 'style'))
	$('link[rel="modulepreload"]').each(f(($) => $.attr('href'), 'script', true))
	// $('img').each(f(($) => $.attr('src'), 'image'))

	return headers
}

async function injectLinkHeader ({ event, resolve }) {
	const resp = await resolve(event)
	if (resp.headers.get('content-type') === 'text/html') {
		const headers = await _generateLinkHeaders(resp)
		headers.forEach((h) => resp.headers.append('link', h))
	}
	return resp
}

export const handle = sequence(
	injectLinkHeader,
	handleCookie,
	storeProject
)
