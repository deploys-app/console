<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		title?: string
		description?: string
		children?: Snippet
	}

	const { title = 'Danger zone', description = '', children }: Props = $props()
</script>

<section class="danger-zone">
	<div class="danger-zone-text">
		<span class="danger-zone-title">
			<i class="fa-solid fa-triangle-exclamation"></i>
			{title}
		</span>
		{#if description}
			<span class="danger-zone-desc">{description}</span>
		{/if}
	</div>
	<div class="danger-zone-actions">
		{@render children?.()}
	</div>
</section>

<style>
	.danger-zone {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem 1.5rem;
		flex-wrap: wrap;
		margin-top: 2rem;
		padding: 1rem 1.25rem;
		border: 1px solid hsl(var(--hsl-negative) / 0.45);
		border-radius: var(--radius-lg);
		background: hsl(var(--hsl-negative) / 0.05);
	}

	.danger-zone-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.danger-zone-title {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-family: var(--ffml-secondary);
		font-weight: 600;
		font-size: 0.9375rem;
		color: hsl(var(--hsl-negative));
	}

	.danger-zone-desc {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.65);
	}

	.danger-zone-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}
</style>
