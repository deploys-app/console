<script lang="ts">
	interface Props {
		span?: number
	}

	const { span = 1 }: Props = $props()
</script>

<td colspan={span} class="text-center">
	Loading...
</td>
