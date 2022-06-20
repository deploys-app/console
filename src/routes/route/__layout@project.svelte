<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'route',
				overrideRedirect: '/route'
			}
		}
	}
</script>

<slot />
