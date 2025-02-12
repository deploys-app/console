<script>
	/**
	 * @typedef {Object} Props
	 * @property {number} [span]
	 * @property {any} [list]
	 */

	/** @type {Props} */
	const { span = 1, list = [] } = $props()
</script>

{#if !list?.length}
	<tr>
		<td colspan={span} class="_tal-ct">
			No data
		</td>
	</tr>
{/if}
