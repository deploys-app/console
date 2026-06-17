// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			token: string
			project: string
		}
	}

	// `duplex` is required by the WHATWG fetch spec when streaming a request
	// body but is missing from the current TS DOM lib types. Declare it so the
	// streaming-proxy fetches typecheck without per-call escape hatches.
	interface RequestInit {
		duplex?: 'half'
	}
}

export {}
