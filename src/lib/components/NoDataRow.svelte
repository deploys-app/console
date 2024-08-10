<script>
	export let span = 1
	export let list = []
</script>

{#if !list?.length}
	<td colspan={span} class="_tal-ct">
		No data
	</td>
{/if}
