<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'email',
				overrideRedirect: '/email'
			}
		}
	}
</script>

<slot />
