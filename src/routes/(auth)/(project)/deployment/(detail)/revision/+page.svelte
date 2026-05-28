<script>
	import { onMount } from 'svelte'
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const deployment = $derived(data.deployment)
	const revisions = $derived(data.revisions)

	let now = $state(Date.now())
	onMount(() => {
		const t = setInterval(() => { now = Date.now() }, 30_000)
		return () => clearInterval(t)
	})

	/**
	 * @param {string} ts
	 * @param {number} nowMs
	 */
	function relTime (ts, nowMs) {
		const t = Date.parse(ts)
		if (isNaN(t)) return ''
		const diff = Math.max(0, nowMs - t)
		if (diff < 60_000) return 'just now'
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
		return `${Math.floor(diff / 86_400_000)}d ago`
	}

	/** @param {number} toRevision */
	function rollback (toRevision) {
		modal.confirm({
			title: `Rollback ${deployment.name} to revision ${toRevision}`,
			yes: 'Rollback',
			callback: async () => {
				const resp = await api.invoke('deployment.rollback', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name,
					revision: toRevision
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/deployment/detail?project=${deployment.project}&location=${deployment.location}&name=${deployment.name}`)
			}
		})
	}
</script>

<style>
	.rev-shell {
		--rail-fg: hsl(var(--hsl-content));
		--rail-fg-muted: hsl(var(--hsl-content) / 0.5);
		--rail-fg-dim: hsl(var(--hsl-content) / 0.32);
		--rail-divider: hsl(var(--hsl-content) / 0.08);
		--surface-bg: hsl(var(--hsl-base-100));
		--surface-scan: hsl(var(--hsl-content) / 0.018);

		display: flex;
		flex-direction: column;
		background: var(--surface-bg);
		border: 1px solid var(--rail-divider);
		border-radius: 10px;
		overflow: hidden;
		font-feature-settings: 'tnum' 1;
	}

	.rev-rail {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--rail-divider);
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-primary);
		flex-wrap: wrap;
	}

	.rev-rail__brand {
		font-weight: 600;
		color: var(--rail-fg);
		font-size: 0.9rem;
	}

	.rev-rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid var(--rail-divider);
	}

	.stat {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		color: var(--rail-fg-muted);
		font-size: 0.8125rem;
	}

	.stat__value {
		color: var(--rail-fg);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.stat__unit { color: var(--rail-fg-muted); }

	.rev-list {
		position: relative;
		flex: 1;
		min-height: 12rem;
		max-height: calc(100dvh - 31rem);
		overflow-y: auto;
		overflow-x: hidden;
		list-style: none;
		margin: 0;
		padding: 0.5rem 0;
		background:
			repeating-linear-gradient(
				to bottom,
				transparent 0,
				transparent calc(2.5rem - 1px),
				var(--surface-scan) calc(2.5rem - 1px),
				var(--surface-scan) 2.5rem
			),
			var(--surface-bg);
	}

	.rev-row {
		display: grid;
		grid-template-columns:
			[mark]  3px
			[rev]   5rem
			[image] 1fr
			[meta]  auto
			[act]   auto;
		align-items: center;
		column-gap: 1rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid hsl(var(--hsl-content) / 0.04);
		transition: background-color 0.12s ease;
	}

	.rev-row:last-child { border-bottom: none; }
	.rev-row:hover { background: hsl(var(--hsl-content) / 0.04); }

	.rev-row[data-active='true'] {
		background: hsl(var(--hsl-primary) / 0.05);
	}
	.rev-row[data-active='true']:hover {
		background: hsl(var(--hsl-primary) / 0.08);
	}

	.rev-row__mark {
		grid-column: mark;
		align-self: stretch;
		border-radius: 3px;
		background: transparent;
		margin: 0.15rem 0;
	}
	.rev-row[data-active='true'] .rev-row__mark {
		background: hsl(var(--hsl-primary));
	}

	.rev-row__rev {
		grid-column: rev;
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.rev-row__rev-num {
		font-family: var(--ffml-mono);
		font-size: 1.1rem;
		font-weight: 700;
		color: hsl(var(--hsl-content));
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}

	.rev-row[data-active='true'] .rev-row__rev-num {
		color: hsl(var(--hsl-primary));
	}

	.rev-row__rev-tag {
		font-family: var(--ffml-primary);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
	}

	.rev-row__image {
		grid-column: image;
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content));
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		direction: rtl;
		text-align: left;
	}

	.rev-row__meta {
		grid-column: meta;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		min-width: 0;
	}

	.rev-row__when {
		font-family: var(--ffml-mono);
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.55);
		font-variant-numeric: tabular-nums;
		cursor: help;
	}

	.rev-row__by {
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.4);
		font-family: var(--ffml-mono);
	}

	.rev-row__act { grid-column: act; }

	.rail-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		border-radius: 6px;
		padding: 0 0.75rem;
		height: 1.75rem;
		color: hsl(var(--hsl-content));
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.rail-btn:hover {
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.2);
	}

	@media (max-width: 768px) {
		.rev-row {
			grid-template-columns:
				[mark]  3px
				[rev]   3.5rem
				[image] 1fr
				[act]   auto;
			grid-template-areas: 'mark rev image act'
								 'mark meta meta act';
			column-gap: 0.5rem;
			row-gap: 0.2rem;
		}
		.rev-row__meta { grid-column: 2 / 4; align-items: flex-start; }
		.rev-row__image { direction: ltr; }
	}
</style>

<div class="rev-shell">
	<header class="rev-rail">
		<span class="rev-rail__brand">Revisions</span>

		<div class="rev-rail__stats">
			<span class="stat" title="total revisions tracked">
				<span class="stat__value">{revisions.length}</span>
				<span class="stat__unit">tracked</span>
			</span>

			<span class="stat" title="currently active revision">
				<span class="stat__value">#{revisions[0]?.revision ?? deployment.revision}</span>
				<span class="stat__unit">active</span>
			</span>
		</div>
	</header>

	<ol class="rev-list">
		{#each revisions as it, i (it.revision)}
			<li class="rev-row" data-active={i === 0}>
				<span class="rev-row__mark" aria-hidden="true"></span>
				<span class="rev-row__rev">
					<span class="rev-row__rev-num">#{it.revision}</span>
					{#if i === 0}
						<span class="rev-row__rev-tag">Active</span>
					{/if}
				</span>
				<span class="rev-row__image" title={it.image}>{it.image}</span>
				<span class="rev-row__meta">
					<span class="rev-row__when" title={it.createdAt}>
						{format.datetime(it.createdAt)} · {relTime(it.createdAt, now)}
					</span>
					<span class="rev-row__by">by {it.createdBy}</span>
				</span>
				<span class="rev-row__act">
					{#if i > 0}
						<button type="button" class="rail-btn"
							onclick={() => rollback(it.revision)}>
							<i class="fa-solid fa-rotate-left"></i>
							Rollback
						</button>
					{/if}
				</span>
			</li>
		{/each}
	</ol>
</div>
