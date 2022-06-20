<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'role',
				overrideRedirect: '/role'
			}
		}
	}
</script>

<slot />
