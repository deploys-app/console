<script>
	import { browser } from '$app/environment'
	import { beforeNavigate } from '$app/navigation'
	import { updated } from '$app/stores'
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	const { children } = $props()

	if (browser) {
		beforeNavigate(({ willUnload, to }) => {
			if ($updated && !willUnload && to?.url) {
				location.href = to.url.href
			}
		})
	}
</script>

{@render children?.()}
