import adapter from '@sveltejs/adapter-cloudflare'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess({
		sass: true
	}),
	kit: {
		adapter: adapter(),
		inlineStyleThreshold: 1024
	}
}

export default config
