// Public modal API — unchanged signatures (`import * as modal from '$lib/modal'`).
// Backed by a native <dialog> (see store.svelte.ts + Modal.svelte) instead of
// SweetAlert2. Modal.svelte must be mounted once in the app shell for these to
// render.
export { confirm, error, success, prompt } from './store.svelte'
