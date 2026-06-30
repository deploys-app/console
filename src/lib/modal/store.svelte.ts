// Shared state behind the app's modal helpers. The public API (confirm / error
// / success / prompt) keeps the signatures the app already used — callers still
// `await modal.confirm({ ... })`. What changed is the rendering: a single native
// <dialog> mounted by Modal.svelte (top layer, focus trap, Esc for free) instead
// of SweetAlert2. The dialog closes via plain JS (dialogEl.close()); we
// deliberately do NOT use the Invoker Commands API here, as iOS support is still
// limited. This module holds the reactive state Modal.svelte reads and the
// promise plumbing that turns each dialog close back into a resolved value.

type ModalKind = 'confirm' | 'error' | 'success' | 'prompt'
type ModalIcon = 'warning' | 'error' | 'success' | 'none'

interface ModalInput {
	label?: string
	placeholder?: string
	multiline?: boolean
}

interface ModalState {
	open: boolean
	kind: ModalKind
	icon: ModalIcon
	heading: string
	/** Body text, one entry per line — keeps validation lists multi-line without raw HTML. */
	lines: string[]
	/** Optional bulleted list under the body (e.g. the routes blocking a domain delete). */
	listItems: string[]
	/** Optional muted footnote under the list (e.g. "…and N more."). */
	note: string
	confirmText: string
	/** A `button` variant class (e.g. `is-variant-negative`) or '' for the default primary. */
	confirmVariant: string
	cancel: boolean
	cancelText: string
	input: ModalInput | null
	/** When set, the confirm action stays disabled until the trimmed input equals this. */
	requireMatch: string | null
	/** Bound to the prompt input; also the value resolved when a prompt confirms. */
	value: string
}

const defaults: ModalState = {
	open: false,
	kind: 'confirm',
	icon: 'none',
	heading: '',
	lines: [],
	listItems: [],
	note: '',
	confirmText: 'OK',
	confirmVariant: '',
	cancel: false,
	cancelText: 'Cancel',
	input: null,
	requireMatch: null,
	value: ''
}

export const modalState = $state<ModalState>({ ...defaults })

let resolver: ((result: unknown) => void) | null = null

function open (patch: Partial<ModalState>): Promise<unknown> {
	// Defensive: if a modal is somehow still pending, resolve it as dismissed
	// before taking over so its caller never hangs. Shape it per the OUTGOING kind
	// (modalState isn't reassigned until the Object.assign below) so a displaced
	// prompt resolves to null — never undefined, which a caller's `.trim()` chokes on.
	if (resolver) {
		const stale = resolver
		resolver = null
		const k = modalState.kind
		stale(k === 'confirm' ? false : k === 'prompt' ? null : undefined)
	}
	Object.assign(modalState, defaults, patch, { open: true })
	return new Promise((resolve) => {
		resolver = resolve
	})
}

/**
 * Called by Modal.svelte on the <dialog>'s `close` event. `confirmed` is true
 * when the confirm button was the one activated. Resolves the pending promise
 * with the shape each helper expects, then clears the open flag.
 */
export function settle (confirmed: boolean): void {
	const resolve = resolver
	resolver = null
	const { kind, value } = modalState
	modalState.open = false
	if (!resolve) return
	if (kind === 'confirm') resolve(confirmed)
	else if (kind === 'prompt') resolve(confirmed ? value : null)
	else resolve(undefined)
}

interface ConfirmOptions {
	title?: string
	yes?: string
	callback?: (() => void) | null
}

export async function confirm ({ title, yes, callback }: ConfirmOptions): Promise<boolean> {
	const ok = await open({
		kind: 'confirm',
		icon: 'warning',
		heading: 'Are you sure?',
		lines: title ? [title] : [],
		confirmText: yes || 'Yes',
		confirmVariant: 'is-variant-negative',
		cancel: true
	}) as boolean
	if (ok) callback?.()
	return ok
}

interface ErrorOptions {
	error?: string | Api.Error | unknown
	callback?: (() => void) | null
}

/**
 * Turn an arbitrary error into renderable, escaped pieces. Precedence matches the
 * old SweetAlert helper: domain-in-use list > validation list > message.
 */
function errorContent (error: unknown): { lines: string[], listItems: string[], note: string } {
	if (typeof error === 'string') return { lines: [error], listItems: [], note: '' }
	if (error instanceof Error) return { lines: [error.message], listItems: [], note: '' }
	if (error && typeof error === 'object') {
		const e = error as { domainInUsed?: unknown, routes?: unknown, routesMore?: unknown, validate?: unknown, message?: unknown }
		// Domain delete blocked by routes — show the blockers as a list with a
		// clear next step instead of the raw "api: domain in used by route(s): …".
		if (e.domainInUsed) {
			const routes = Array.isArray(e.routes) ? e.routes.map(String) : []
			const more = typeof e.routesMore === 'number' ? e.routesMore : 0
			if (routes.length) {
				const noun = routes.length === 1 ? 'route' : 'routes'
				const verb = routes.length === 1 ? 'it' : 'them'
				return {
					lines: [`This domain is still used by the following ${noun}. Delete ${verb} first:`],
					listItems: routes,
					note: more ? `…and ${more} more.` : ''
				}
			}
			return { lines: ['This domain is still in use by one or more routes. Delete its routes first.'], listItems: [], note: '' }
		}
		if (Array.isArray(e.validate)) return { lines: e.validate.map(String), listItems: [], note: '' }
		if (typeof e.message === 'string') return { lines: [e.message], listItems: [], note: '' }
	}
	return { lines: ['Unexpected error.'], listItems: [], note: '' }
}

export async function error ({ error, callback }: ErrorOptions): Promise<void> {
	if (!error) {
		callback?.()
		return
	}
	await open({
		kind: 'error',
		icon: 'error',
		heading: 'Oops…',
		...errorContent(error),
		confirmText: 'OK',
		confirmVariant: 'is-variant-negative'
	})
	callback?.()
}

interface SuccessOptions {
	content?: string
}

export async function success ({ content }: SuccessOptions): Promise<void> {
	await open({
		kind: 'success',
		icon: 'success',
		heading: 'Success',
		lines: content ? [content] : [],
		confirmText: 'OK',
		confirmVariant: 'is-variant-positive'
	})
}

interface PromptOptions {
	/** Heading line (e.g. the question). */
	title?: string
	/** Optional explanatory body text. */
	text?: string
	label?: string
	placeholder?: string
	multiline?: boolean
	yes?: string
	/** Confirm `button` variant class; defaults to the primary button. */
	variant?: string
	initial?: string
	/** Type-to-confirm gate: confirm stays disabled until the trimmed input matches. */
	requireMatch?: string
}

/**
 * A confirm with a free-text field. Resolves to the entered string when
 * confirmed (may be empty unless `requireMatch` is set), or `null` when
 * cancelled/dismissed.
 */
export async function prompt ({ title, text, label, placeholder, multiline, yes, variant, initial, requireMatch }: PromptOptions): Promise<string | null> {
	return await open({
		kind: 'prompt',
		icon: 'warning',
		heading: title || '',
		lines: text ? [text] : [],
		confirmText: yes || 'OK',
		confirmVariant: variant ?? '',
		cancel: true,
		input: { label, placeholder, multiline },
		requireMatch: requireMatch ?? null,
		value: initial ?? ''
	}) as string | null
}
