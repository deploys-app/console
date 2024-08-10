<script>
	export let span = 1
	export let error
</script>

{#if error}
	<td colspan={span} class="_tal-ct">
		{#if error.forbidden}
			You don't have permission to view data
		{:else if error.message}
			{error.message}
		{:else}
			{error}
		{/if}
	</td>
{/if}
