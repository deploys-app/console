import adapterNode from '@sveltejs/adapter-node'
import adapterCloudflare from '@sveltejs/adapter-cloudflare'
import preprocess from 'svelte-preprocess'

function adapter () {
	if (process.env.CF_PAGES) return adapterCloudflare()
	return adapterNode()
}

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
