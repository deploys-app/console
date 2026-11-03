<script lang="ts">
	// Present so the type checker emits a module type for this component.
</script>

<div class="metrics-loading" role="status">
	<i class="fa-solid fa-spinner-third fa-spin" aria-hidden="true"></i>
	<span>Loading metrics…</span>
</div>

<style>
	.metrics-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 18rem;
		margin-top: 1rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.metrics-loading i {
		font-size: 1.5rem;
	}
</style>
