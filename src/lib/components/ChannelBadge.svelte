<script lang="ts">
	interface Props {
		channel: Api.AuditChannel
	}

	const { channel }: Props = $props()

	const badge = $derived.by(() => {
		switch (channel) {
		case 'api': return { cls: 'is-api', label: 'API' }
		case 'console': return { cls: 'is-console', label: 'Console' }
		case 'cli': return { cls: 'is-cli', label: 'CLI' }
		case 'mcp': return { cls: 'is-mcp', label: 'MCP' }
		default: return null // legacy rows recorded before the channel column
		}
	})
</script>

<style>
	.channel-badge {
		display: inline-block;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		line-height: 1.25;
		background: hsl(var(--hsl-content) / 0.08);
		color: hsl(var(--hsl-content) / 0.75);
	}

	.channel-badge.is-api {
		color: hsl(var(--hsl-info));
		background: hsl(var(--hsl-info) / 0.12);
	}

	.channel-badge.is-console {
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
	}

	.channel-badge.is-cli {
		color: hsl(var(--hsl-accent));
		background: hsl(var(--hsl-accent) / 0.12);
	}

	.channel-badge.is-mcp {
		color: hsl(var(--hsl-warning));
		background: hsl(var(--hsl-warning) / 0.14);
	}

	.channel-muted {
		color: hsl(var(--hsl-content) / 0.4);
	}
</style>

{#if badge}
	<span class="channel-badge {badge.cls}">{badge.label}</span>
{:else}
	<span class="channel-muted">—</span>
{/if}
