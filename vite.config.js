import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { sentrySvelteKit } from '@sentry/sveltekit'

export default defineConfig({
	plugins: [
		process.env.SENTRY_AUTH_TOKEN
			? sentrySvelteKit({ autoInstrument: false })
			: null,
		sveltekit()
	]
})
