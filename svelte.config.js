import adapter from '@sveltejs/adapter-node'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess({
		sass: true
	}),
	kit: {
		adapter: adapter(),
		alias: {
			$style: './src/style',
			$types: './src/types'
		}
	}
}

export default config
