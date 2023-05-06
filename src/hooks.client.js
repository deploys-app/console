import * as Sentry from '@sentry/svelte'
import { env } from '$env/dynamic/public'

if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		tracesSampleRate: 1
	})
}

/** @type {import('@sveltejs/kit').HandleClientError} */
export async function handleError({ error, event }) {
	Sentry.captureException(error, { contexts: { sveltekit: { event } } })

	return {
		// @ts-ignore
		message: error.message || 'Unknown Error'
	}
}
