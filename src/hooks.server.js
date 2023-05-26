import * as Sentry from '@sentry/sveltekit'
import { sequence } from '@sveltejs/kit/hooks'
import { env } from '$env/dynamic/public'

if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN
	})
}

const allowTheme = {
	dark: true,
	light: true
}

/** @type {import('@sveltejs/kit').Handle} */
async function theme ({ event, resolve }) {
	let t = event.cookies.get('theme')
	if (!allowTheme[t]) {
		t = 'dark'
	}
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('data-theme=""', `data-theme="${t}"`)
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
	Sentry.sentryHandle(),
	theme,
	handleCookie,
	storeProject
)
export const handleError = Sentry.handleErrorWithSentry()
