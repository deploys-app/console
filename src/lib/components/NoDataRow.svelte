<script>
	export let span = 1
	/** @type {?Array} */
	export let list
</script>

{#if !list?.length}
	<td colspan={span} class="_tal-ct">
		No data
	</td>
{/if}
