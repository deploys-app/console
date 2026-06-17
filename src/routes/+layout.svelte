<script lang="ts">
	import type { Snippet } from 'svelte'
	import { browser } from '$app/environment'
	import { beforeNavigate } from '$app/navigation'
	import { updated } from '$app/stores'

	const { children }: { children: Snippet } = $props()

	if (browser) {
		beforeNavigate(({ willUnload, to }) => {
			if ($updated && !willUnload && to?.url) {
				location.href = to.url.href
			}
		})
	}
</script>

{@render children?.()}
