<script lang="ts">
	interface Props {
		span?: number
		// error is an Api.Error, a thrown Error, or a bare string — accessed
		// loosely in the template, so it stays untyped.
		error: any
	}

	const { span = 1, error }: Props = $props()
</script>

{#if error}
	<tr>
		<td colspan={span} class="text-center">
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
