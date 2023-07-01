declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		'on:sidebar:toggle'?: () => void
	}
}
