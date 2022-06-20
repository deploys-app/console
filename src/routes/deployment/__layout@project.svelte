<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'deployment',
				overrideRedirect: '/deployment'
			}
		}
	}
</script>

<slot />
