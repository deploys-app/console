import adapter from '@sveltejs/adapter-cloudflare'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess({
		sass: true
	}),
	kit: {
		adapter: adapter(),
		alias: {
			'$style': './src/style',
		}
	}
}

export default config
