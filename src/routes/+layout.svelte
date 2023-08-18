<script>
	import { browser } from '$app/environment'
	import { beforeNavigate } from '$app/navigation'
	import { updated } from '$app/stores'

	if (browser) {
		beforeNavigate(({ willUnload, to }) => {
			if ($updated && !willUnload && to?.url) {
				location.href = to.url.href
			}
		})
	}
</script>

<slot />
