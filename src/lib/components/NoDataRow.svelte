<script lang="ts">
	interface Props {
		span?: number
		list?: unknown[]
		/** FontAwesome class, e.g. 'fa-box-open' */
		icon?: string
		message?: string
		hint?: string
		ctaLabel?: string
		ctaHref?: string
		/**
		 * When the load errored, the paired ErrorRow owns the message — suppress
		 * the empty-state so the two don't stack ("Nothing here yet" + the error).
		 */
		error?: unknown
	}

	const {
		span = 1,
		list = [],
		icon = 'fa-inbox',
		message = 'Nothing here yet',
		hint = '',
		ctaLabel = '',
		ctaHref = '',
		error = undefined
	}: Props = $props()
</script>

{#if !error && !list?.length}
	<tr class="no-data-row">
		<td colspan={span}>
			<div class="empty">
				<i class="fa-solid {icon} empty-icon"></i>
				<span class="empty-message">{message}</span>
				{#if hint}
					<span class="empty-hint">{hint}</span>
				{/if}
				{#if ctaLabel && ctaHref}
					<a class="button is-size-small is-icon-left mt-1" href={ctaHref}>
						<i class="fa-solid fa-plus"></i>
						{ctaLabel}
					</a>
				{/if}
			</div>
		</td>
	</tr>
{/if}

<style>
	.no-data-row td {
		white-space: normal;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 0.3rem;
		padding: 2.5rem 1rem;
	}

	.empty-icon {
		font-size: 1.5rem;
		color: hsl(var(--hsl-content) / 0.3);
		margin-bottom: 0.35rem;
	}

	.empty-message {
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
	}

	.empty-hint {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.5);
	}
</style>
