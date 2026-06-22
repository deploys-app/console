<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		// Which line-icon to show above the title; omit for the bare loading pane.
		icon?: 'lock' | 'alert' | 'check'
		title: string
		hint?: string
		// Optional trailing content, e.g. a "Try again" button.
		action?: Snippet
	}
	const { icon, title, hint, action }: Props = $props()
</script>

<div class="state-pane">
	{#if icon === 'lock'}
		<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<rect x="3" y="11" width="18" height="11" rx="2"></rect>
			<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
		</svg>
	{:else if icon === 'alert'}
		<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<circle cx="12" cy="12" r="9"></circle>
			<path d="M12 8v4M12 16h.01"></path>
		</svg>
	{:else if icon === 'check'}
		<svg class="state-pane__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<path d="M9 12l2 2 4-4"></path>
			<circle cx="12" cy="12" r="9"></circle>
		</svg>
	{/if}
	<div class="state-pane__title">{title}</div>
	{#if hint}
		<div class="state-pane__hint">{hint}</div>
	{/if}
	{@render action?.()}
</div>

<style>
	.state-pane {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: 18rem;
		padding: 3rem 1.5rem;
		text-align: center;
		font-family: var(--ffml-primary);
	}
	.state-pane__icon {
		width: 2.5rem;
		height: 2.5rem;
		color: hsl(var(--hsl-content) / 0.3);
	}
	.state-pane__title {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.7);
	}
	.state-pane__hint {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.45);
		max-width: 26rem;
	}
</style>
