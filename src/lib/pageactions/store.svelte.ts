// Context-specific actions the current page contributes to the command palette.
// SearchModal (mounted once in the authed shell, above the project layout) reads
// this store to surface the current page's actions at the top of the palette, so
// the console is operable keyboard-only. A page registers its actions inside an
// $effect so navigating away (component destroy) always clears them, and the set
// re-registers when the derived state that gates the actions (e.g. can-pause)
// changes. Svelte context can't carry this — SearchModal lives above the page —
// so it's a module-level rune store, mirroring $lib/modal/store.svelte.ts.

/**
 * A single context action offered by the current page. `href` navigates;
 * `run` invokes an imperative handler (e.g. opens a confirm dialog) — set one.
 * Only actionable items should be registered (omit anything the user lacks
 * permission for or that doesn't apply to the current state), so the palette
 * never lists a disabled row.
 */
export interface PageAction {
	id: string // stable key, unique within the page's action set
	label: string // primary text (the thing you'd type)
	icon?: string // Font Awesome class, e.g. `fa-pause`
	keywords?: string // extra searchable text, never shown
	href?: string // navigation target (mutually exclusive with `run`)
	run?: () => void // imperative handler (mutually exclusive with `href`)
}

export const pageActions = $state<{ items: PageAction[] }>({ items: [] })

/**
 * Register the current page's actions, replacing any previous set. Returns a
 * cleanup that clears them — but only if this exact set is still the active one,
 * so a stale cleanup (an $effect teardown that fires after a newer page already
 * registered) never clobbers the newer registration.
 */
export function registerPageActions (items: PageAction[]): () => void {
	pageActions.items = items
	return () => {
		if (pageActions.items === items) pageActions.items = []
	}
}
