<script>
	import { onMount, tick } from 'svelte'
	import { browser } from '$app/environment'
	import { beforeNavigate } from '$app/navigation'
	import { updated } from '$app/state'
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	const { children } = $props()

	onMount(async () => {
		document.documentElement.style.setProperty(
			'--dvh',
			`${window.innerHeight}px`
		)
		await tick()
	})

	if (browser) {
		beforeNavigate(({ willUnload, to }) => {
			if (updated.current && !willUnload && to?.url) {
				location.href = to.url.href
			}
		})
	}
</script>

{@render children?.()}
