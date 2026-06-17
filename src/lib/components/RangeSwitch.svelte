<script lang="ts">
	import { RANGE_OPTIONS } from '$lib/metrics'

	interface Props {
		value: string
		onselect: (value: string) => void
	}

	const { value, onselect }: Props = $props()
</script>

<div class="range-switch" role="group" aria-label="Time range">
	{#each RANGE_OPTIONS as opt (opt.value)}
		<button
			type="button"
			class="range-btn"
			class:is-active={value === opt.value}
			aria-pressed={value === opt.value}
			onclick={() => onselect(opt.value)}>{opt.label}</button>
	{/each}
</div>

<style>
	.range-switch {
		display: inline-flex;
		padding: 0.1875rem;
		gap: 0.125rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.range-btn {
		padding: 0.3125rem 0.6875rem;
		border-radius: 0.4375rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-fastest) ease, background var(--timing-fastest) ease;
	}

	.range-btn:hover {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.range-btn.is-active {
		color: hsl(var(--hsl-primary-content));
		background: hsl(var(--hsl-primary));
	}
</style>
