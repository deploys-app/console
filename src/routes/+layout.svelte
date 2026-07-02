<script lang="ts">
	import type { Snippet } from 'svelte'
	import { browser } from '$app/environment'
	import { beforeNavigate, onNavigate } from '$app/navigation'
	import { updated } from '$app/stores'

	const { children }: { children: Snippet } = $props()

	if (browser) {
		beforeNavigate(({ willUnload, to }) => {
			if ($updated && !willUnload && to?.url) {
				location.href = to.url.href
			}
		})
	}

	// Animate page changes with the View Transitions API (progressive
	// enhancement — no-op where unsupported). Same-path navigations are
	// skipped so query-param updates (filters, project switch) don't flash.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		// The mobile nav drawer closes as the navigation commits; its slide-out
		// must stay live — a view transition freezes it in the old snapshot and
		// ends with a visible jump mid-slide. Let the slide be the animation.
		if (document.querySelector('.app-layout.is-shown-sidebar')) return

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve()
				// Swallow aborted navigations (rejected `complete`) — the
				// transition just crossfades whatever state the abort left.
				await navigation.complete.catch(() => {})
			})
		})
	})
</script>

{@render children?.()}
