<script context="module">
	export function load () {
		return {
			stuff: {
				menu: 'workload-identity',
				overrideRedirect: '/workload-identity'
			}
		}
	}
</script>

<slot />
