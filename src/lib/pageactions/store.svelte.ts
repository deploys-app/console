// Context-specific actions the current page contributes to the command palette.
// SearchModal (mounted once in the authed shell, above the project layout) reads
// this store to surface the current page's actions at the top of the palette, so
// the console is operable keyboard-only. A page registers its actions inside an
// $effect so navigating away (component destroy) always clears them, and the set
// re-registers when the derived state that gates the actions (e.g. can-pause)
// changes. Svelte context can't carry this — SearchModal lives above the page —
// so it's a module-level rune store, mirroring $lib/modal/store.svelte.ts.
//
// Multiple components can contribute at once (a section layout AND a tab page, or
// a detail Header AND a ListTable within a tab), so registrations stack: each
// call adds an independent set and the palette sees every set concatenated in
// registration order (so a Header that mounts before its tab's ListTable leads).

import { untrack } from 'svelte'

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

interface Registration {
	// A primitive token, not object identity: `pageActions.sets` is a Svelte deep
	// $state proxy, so the object pushed in is stored proxy-wrapped and the raw
	// reference held by the cleanup no longer matches via indexOf. Matching on this
	// numeric token (a primitive read back through the proxy) removes exactly the
	// right set on cleanup.
	token: number
	items: PageAction[]
}

let nextToken = 0

export const pageActions = $state<{ sets: Registration[] }>({ sets: [] })

/**
 * All registered actions, flattened in registration order. Reads `pageActions`
 * in a tracked context (SearchModal calls this inside a $derived), so the palette
 * recomputes whenever a page's actions change.
 */
export function allPageActions (): PageAction[] {
	return pageActions.sets.flatMap((s) => s.items)
}

/**
 * Register a set of actions for the current page, added after any already
 * registered. Returns a cleanup that removes only this set.
 *
 * Callers register from inside a page $effect. The store reads/writes are wrapped
 * in `untrack` so that reading `pageActions.sets` (e.g. `.push`/`.findIndex` first
 * dereference the array) does NOT make the calling effect depend on the store —
 * otherwise the mutation on the next line would re-trigger that same effect
 * forever (effect_update_depth_exceeded). Writes still notify SearchModal, whose
 * $derived reads the store in its own tracked context.
 */
export function registerPageActions (items: PageAction[]): () => void {
	const token = nextToken++
	untrack(() => pageActions.sets.push({ token, items }))
	return () => {
		untrack(() => {
			const i = pageActions.sets.findIndex((s) => s.token === token)
			if (i !== -1) pageActions.sets.splice(i, 1)
		})
	}
}
