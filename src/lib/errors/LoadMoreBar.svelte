<script lang="ts">
	interface Props {
		nextCursor: string | undefined
		query: string
		loadingMore: boolean
		loadMoreError: boolean
		onLoadMore: () => void
	}
	const { nextCursor, query, loadingMore, loadMoreError, onLoadMore }: Props = $props()
</script>

{#if nextCursor}
	<div class="load-more-bar">
		{#if query.trim()}
			<!-- The filter runs over loaded rows only, so paging more in while a query
			     is active just hides them — explain instead of an inert button. -->
			<span class="load-more-hint">Filter applies to loaded issues only — clear it to load more.</span>
		{:else}
			{#if loadMoreError}
				<span class="load-more-error">Couldn't load more issues.</span>
			{/if}
			<button
				type="button"
				class="button is-variant-secondary is-size-small"
				class:is-loading={loadingMore}
				disabled={loadingMore}
				onclick={onLoadMore}>
				{loadMoreError ? 'Try again' : 'Load more'}
			</button>
		{/if}
	</div>
{/if}

<style>
	.load-more-bar {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}
	.load-more-hint {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.5);
		text-align: center;
	}
	.load-more-error {
		font-size: 0.75rem;
		color: hsl(var(--hsl-negative));
		text-align: center;
	}
</style>
