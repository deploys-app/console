/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
	interface Locals {
		state: string
		token: string
	}
	// interface Platform {}
	// interface Session {}
	interface Stuff {
		project: string
		menu: string
	}
}
