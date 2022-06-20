<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'disk',
				overrideRedirect: '/disk'
			}
		}
	}
</script>

<slot />
