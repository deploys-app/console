<script lang="ts">
	import LiveLogs from '$lib/deployment/LiveLogs.svelte'
	import HistoryLogs from '$lib/deployment/HistoryLogs.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const deployment = $derived(data.deployment)

	// Live tail and durable history live on the same tab; this toggle swaps them.
	// Switching remounts the active view (Live reconnects its SSE, History refetches).
	let mode = $state<'live' | 'history'>('live')
</script>

<style>
	/* Segmented Live/History control rendered at the start of each mode's rail
	   (passed in as a snippet, so it keeps these styles wherever it renders). */
	.mode-toggle {
		display: inline-flex;
		background: hsl(var(--hsl-content) / 0.05);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 7px;
		padding: 2px;
		gap: 2px;
	}

	.mode-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: transparent;
		border-radius: 5px;
		padding: 0 0.6rem;
		height: 1.55rem;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.55);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
	}

	.mode-btn:hover { color: hsl(var(--hsl-content) / 0.85); }

	.mode-btn[data-active='true'] {
		background: hsl(var(--hsl-base-100));
		color: hsl(var(--hsl-content));
		box-shadow: 0 1px 2px hsl(var(--hsl-content) / 0.1);
	}

	.mode-dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; background: hsl(var(--hsl-content) / 0.3); }
	.mode-btn[data-active='true'] .mode-dot--live { background: hsl(var(--hsl-positive)); }
</style>

{#snippet toggle()}
	<div class="mode-toggle" role="tablist" aria-label="Log view">
		<button type="button" class="mode-btn" role="tab" aria-selected={mode === 'live'}
			data-active={mode === 'live'} onclick={() => (mode = 'live')}>
			<span class="mode-dot mode-dot--live"></span> Live
		</button>
		<button type="button" class="mode-btn" role="tab" aria-selected={mode === 'history'}
			data-active={mode === 'history'} onclick={() => (mode = 'history')}>
			History
		</button>
	</div>
{/snippet}

{#if mode === 'live'}
	<LiveLogs {deployment} {toggle} />
{:else}
	<HistoryLogs {deployment} {toggle} />
{/if}
