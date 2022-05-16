/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
	interface Locals {
		session: import('svelte-kit-cookie-session').Session<SessionData>,
		cookies: Record<string, string>
	}
	// interface Platform {}
	// interface Session {}
	interface Stuff {
		project: string
	}
}

interface SessionData {
	// state is the oauth exchange state
	state: string

	// api token
	token: string

	// current project selected
	project: string
}
