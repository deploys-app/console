<script>
	export let span = 1
	export let forbidden = false
</script>

<td colspan={span} class="_tal-ct">
	{#if forbidden}
		You don't have permission to view data
	{:else}
		No data
	{/if}
</td>
