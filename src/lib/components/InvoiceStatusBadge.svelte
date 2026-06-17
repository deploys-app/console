<script lang="ts">
	interface Props {
		status: Api.InvoiceStatus
	}

	const { status }: Props = $props()

	const badge = $derived.by(() => {
		if (status === 'paid') return { icon: 'fa-circle-check', cls: 'is-positive', label: 'Paid' }
		if (status === 'open') return { icon: 'fa-clock', cls: 'is-warning', label: 'Open' }
		if (status === 'void') return { icon: 'fa-ban', cls: 'is-muted', label: 'Void' }
		if (status === 'draft') return { icon: 'fa-pen', cls: 'is-muted', label: 'Draft' }
		return { icon: 'fa-circle', cls: '', label: status }
	})
</script>

<style>
	.invoice-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		line-height: 1.25;
		background: hsl(var(--hsl-content) / 0.08);
	}

	.invoice-badge.is-positive {
		color: hsl(var(--hsl-positive));
		background: hsl(var(--hsl-positive) / 0.12);
	}

	.invoice-badge.is-warning {
		color: hsl(var(--hsl-warning, var(--hsl-primary)));
		background: hsl(var(--hsl-warning, var(--hsl-primary)) / 0.14);
	}

	.invoice-badge.is-muted {
		color: hsl(var(--hsl-content) / 0.65);
	}
</style>

<span class="invoice-badge {badge.cls}" title={badge.label}>
	<i class="fa-solid {badge.icon}"></i>
	{badge.label}
</span>
