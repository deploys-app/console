import * as Sentry from '@sentry/sveltekit'
import { env } from '$env/dynamic/public'

if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		tracesSampleRate: 1
	})
}

export const handleError = Sentry.handleErrorWithSentry()
