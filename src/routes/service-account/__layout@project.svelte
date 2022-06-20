<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'service-account',
				overrideRedirect: '/service-account'
			}
		}
	}
</script>

<slot />
