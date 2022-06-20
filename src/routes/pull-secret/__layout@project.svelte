<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'pull-secret',
				overrideRedirect: '/pull-secret'
			}
		}
	}
</script>

<slot />
