import adapterNode from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapterNode(),
		alias: {
			$style: './src/style',
			$types: './src/types'
		},
		version: {
			pollInterval: 60 * 1000 // 1 min
		}
	}
}

export default config
