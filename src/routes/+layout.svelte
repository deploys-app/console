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
	// enhancement — no-op where unsupported). Fires on every navigation that
	// can change what's rendered — path or query (project switch, filters) —
	// skipping only hash-only jumps within the same page.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return
		if (navigation.from?.url.pathname === navigation.to?.url.pathname &&
			navigation.from?.url.search === navigation.to?.url.search) return
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
