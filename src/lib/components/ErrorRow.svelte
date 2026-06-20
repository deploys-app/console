<script lang="ts">
	import { invalidateAll } from '$app/navigation'

	interface Props {
		span?: number
		// error is an Api.Error, a thrown Error, or a bare string — accessed
		// loosely in the template, so it stays untyped.
		error: any
	}

	const { span = 1, error }: Props = $props()

	// Raw upstream message, surfaced only as a hover hint for support. The
	// visible copy stays friendly and actionable instead of leaking "api: …".
	const detail = $derived(error?.message || (typeof error === 'string' ? error : ''))

	let retrying = $state(false)
	async function retry () {
		if (retrying) return
		retrying = true
		try {
			// Re-runs the page/layout load() functions, so a transient failure
			// recovers in place without a full reload.
			await invalidateAll()
		} finally {
			retrying = false
		}
	}
</script>

{#if error}
	<tr>
		<td colspan={span}>
			{#if error.forbidden}
				<p class="error-state text-content/60">You don't have permission to view data</p>
			{:else}
				<div class="error-state" title={detail}>
					<i class="fa-solid fa-exclamation-triangle text-warning"></i>
					<p class="text-content/70">Something went wrong while loading this data. Please try again later.</p>
					<button
						type="button"
						class="button is-variant-secondary is-size-small"
						class:is-loading={retrying}
						onclick={retry}>
						Try again
					</button>
				</div>
			{/if}
		</td>
	</tr>
{/if}

<style>
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		text-align: center;
	}
</style>
