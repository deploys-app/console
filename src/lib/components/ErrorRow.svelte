<script>
	/**
	 * @typedef {Object} Props
	 * @property {number} [span]
	 * @property {any} error
	 */

	/** @type {Props} */
	let { span = 1, error } = $props()
</script>

{#if error}
	<tr>
		<td colspan={span} class="_tal-ct">
			{#if error.forbidden}
				You don't have permission to view data
			{:else if error.message}
				{error.message}
			{:else}
				{error}
			{/if}
		</td>
	</tr>
{/if}
