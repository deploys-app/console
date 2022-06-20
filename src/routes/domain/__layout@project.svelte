<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'domain',
				overrideRedirect: '/domain'
			}
		}
	}
</script>

<slot />
