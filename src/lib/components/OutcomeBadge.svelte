<script>
	/**
	 * @typedef {Object} Props
	 * @property {Api.AuditOutcome} outcome
	 */

	/** @type {Props} */
	const { outcome } = $props()

	const badge = $derived.by(() => {
		if (outcome === 'success') return { icon: 'fa-circle-check', cls: 'is-positive', label: 'Success' }
		if (outcome === 'failure') return { icon: 'fa-circle-xmark', cls: 'is-negative', label: 'Failure' }
		return { icon: 'fa-circle', cls: '', label: outcome }
	})
</script>

<style lang="scss">
	.outcome-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		line-height: 1.25;
		background: hsl(var(--hsl-content)/0.08);

		&.is-positive {
			color: hsl(var(--hsl-positive));
			background: hsl(var(--hsl-positive)/0.12);
		}

		&.is-negative {
			color: hsl(var(--hsl-negative));
			background: hsl(var(--hsl-negative)/0.12);
		}
	}
</style>

<span class="outcome-badge {badge.cls}" title={badge.label}>
	<i class="fa-solid {badge.icon}"></i>
	{badge.label}
</span>
