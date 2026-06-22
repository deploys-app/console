<script lang="ts">
	interface Props { status: Api.ErrorStatus }
	const { status }: Props = $props()
</script>

<span class="status-chip" data-status={status}>{status}</span>

<style>
	/* Placed by the parent grid's `status` column. */
	.status-chip {
		grid-column: status;
		justify-self: end;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}
	.status-chip::before {
		content: '';
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: currentColor;
	}
	.status-chip[data-status='open'] {
		background: hsl(var(--hsl-negative) / 0.12);
		color: hsl(var(--hsl-negative));
	}
	.status-chip[data-status='resolved'] {
		background: hsl(var(--hsl-positive) / 0.12);
		color: hsl(var(--hsl-positive));
	}
	.status-chip[data-status='muted'] {
		/* muted was near-invisible in light mode at 0.08/0.55 */
		background: hsl(var(--hsl-content) / 0.12);
		color: hsl(var(--hsl-content) / 0.7);
	}
	/* Chips had no dark-mode lift (unlike .kind-badge), so the tints washed out on
	   the dark surface — raise the fills in dark. */
	:global(.dark) .status-chip[data-status='open'] { background: hsl(var(--hsl-negative) / 0.22); }
	:global(.dark) .status-chip[data-status='resolved'] { background: hsl(var(--hsl-positive) / 0.22); }
	:global(.dark) .status-chip[data-status='muted'] {
		background: hsl(var(--hsl-content) / 0.16);
		color: hsl(var(--hsl-content) / 0.72);
	}
</style>
