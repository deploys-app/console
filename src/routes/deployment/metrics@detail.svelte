<script context="module">
	export function load ({ stuff }) {
		const {
			deployment
		} = stuff

		return {
			props: {
				deployment
			}
		}
	}
</script>

<script>
	export let deployment
</script>

<h6><strong>Metric</strong></h6>
