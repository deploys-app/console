<script>
	import { onMount } from 'svelte'
	import { podPrefixStripper } from '$lib/deployment/podName'

	const { data } = $props()

	const deployment = $derived(data.deployment)

	// Pod names show up inside event reasons/messages; strip the shared
	// `<kubeName>-<projectID>-` prefix so only the pod-distinguishing suffix
	// remains (the full text stays available on hover).
	const stripPods = $derived(podPrefixStripper(deployment))

	const POLL_INTERVAL_MS = 5000

	/** @type {Array<{type: string, reason: string, message: string, lastSeen: string}>} */
	let events = $state([])
	let lastFetchOk = $state(false)
	let lastFetchAt = $state(0)
	let now = $state(Date.now())

	onMount(() => {
		// Static deployments have no pods and no eventUrl. The Events tab is
		// hidden for them, but guard direct navigation so we don't poll
		// fetch('') against this page every few seconds.
		if (!deployment.eventUrl) return

		reload()
		const poll = setInterval(reload, POLL_INTERVAL_MS)
		const ticker = setInterval(() => { now = Date.now() }, 1000)
		return () => {
			clearInterval(poll)
			clearInterval(ticker)
		}
	})

	async function reload () {
		try {
			const response = await fetch(deployment.eventUrl)
			if (response.status === 403) return
			const result = await response.json()
			events = result ?? []
			lastFetchOk = true
			lastFetchAt = Date.now()
		} catch {
			lastFetchOk = false
		}
	}

	/**
	 * @param {string} type
	 * @returns {'warn' | 'error' | 'normal'}
	 */
	function severityOf (type) {
		const t = type.toLowerCase()
		if (t === 'normal') return 'normal'
		if (t === 'warning' || t === 'warn') return 'warn'
		return 'error'
	}

	/**
	 * @param {string | number} ts ISO 8601 or unix ms
	 * @param {number} nowMs
	 */
	function relTime (ts, nowMs) {
		const t = typeof ts === 'number' ? ts : Date.parse(ts)
		if (isNaN(t)) return ''
		const diff = Math.max(0, nowMs - t)
		if (diff < 1000) return 'now'
		if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
		return `${Math.floor(diff / 86_400_000)}d`
	}

	const pollText = $derived.by(() => {
		if (!lastFetchAt) return 'connecting…'
		return `synced ${relTime(lastFetchAt, now)} ago`
	})

	const counts = $derived.by(() => {
		const out = { normal: 0, warn: 0, error: 0 }
		for (const e of events) out[severityOf(e.type)] += 1
		return out
	})
</script>

<style>
	.events-shell {
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
		font-feature-settings: 'tnum' 1, 'ss02' 1;
	}

	.events-rail {
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

	.events-rail__brand {
		margin: 0;
		font-weight: 600;
		color: var(--rail-fg);
		font-size: 0.9rem;
	}

	.events-rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid var(--rail-divider);
		flex-wrap: wrap;
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

	.stat-dot {
		position: relative;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
		background: hsl(var(--hsl-content) / 0.4);
	}

	.stat-dot[data-state='live'] {
		background: hsl(var(--hsl-positive));
		animation: live-pulse 1.8s ease-out infinite;
	}

	.stat-dot[data-state='cold'] {
		background: hsl(var(--hsl-content) / 0.45);
		animation: dim-blink 1.2s ease-in-out infinite;
	}

	@keyframes live-pulse {
		0%, 100% { box-shadow: 0 0 0 0 hsl(var(--hsl-positive) / 0.55); }
		60%      { box-shadow: 0 0 0 6px hsl(var(--hsl-positive) / 0); }
	}

	@keyframes dim-blink {
		0%, 100% { opacity: 0.45; }
		50%      { opacity: 1; }
	}

	.stat-count {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8125rem;
		color: var(--rail-fg-muted);
	}

	.stat-count::before {
		content: '';
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: currentColor;
	}

	.stat-count[data-tone='normal']  { color: hsl(var(--hsl-content) / 0.55); }
	.stat-count[data-tone='warn']    { color: hsl(var(--hsl-warning)); }
	.stat-count[data-tone='error']   { color: hsl(var(--hsl-negative)); }

	.stat-count__num {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--rail-fg);
	}

	/* surface */
	.events-surface {
		position: relative;
		flex: 1;
		min-height: 14rem;
		max-height: calc(100dvh - 31rem);
		overflow-y: auto;
		overflow-x: hidden;
		background:
			repeating-linear-gradient(
				to bottom,
				transparent 0,
				transparent calc(1.5rem - 1px),
				var(--surface-scan) calc(1.5rem - 1px),
				var(--surface-scan) 1.5rem
			),
			var(--surface-bg);
	}

	.events-list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0 0.5rem;
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
	}

	.event-row {
		display: grid;
		grid-template-columns:
			[time]   3.25rem
			[mark]   2px
			[type]   6rem
			[reason] 11rem
			[msg]    1fr;
		align-items: start;
		column-gap: 0.65rem;
		padding: 0.2rem 1rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.92);
		transition: background-color 0.12s ease;
	}

	.event-row:hover { background: hsl(var(--hsl-content) / 0.04); }

	.event-row__time {
		grid-column: time;
		color: hsl(var(--hsl-content) / 0.42);
		font-variant-numeric: tabular-nums;
		text-align: right;
		font-size: 0.6875rem;
		padding-top: 0.075rem;
		cursor: help;
	}

	.event-row__mark {
		grid-column: mark;
		align-self: stretch;
		background: transparent;
		border-radius: 2px;
		margin: 0.1rem 0;
	}

	.event-row[data-severity='warn'] {
		background: hsl(var(--hsl-warning) / 0.04);
	}
	.event-row[data-severity='warn']:hover {
		background: hsl(var(--hsl-warning) / 0.09);
	}
	.event-row[data-severity='warn']  .event-row__mark { background: hsl(var(--hsl-warning)); }

	.event-row[data-severity='error'] {
		background: hsl(var(--hsl-negative) / 0.05);
	}
	.event-row[data-severity='error']:hover {
		background: hsl(var(--hsl-negative) / 0.1);
	}
	.event-row[data-severity='error'] .event-row__mark { background: hsl(var(--hsl-negative)); }

	.event-row__type {
		grid-column: type;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.1rem 0.5rem;
		align-self: center;
		border-radius: 4px;
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.7);
		font-family: var(--ffml-primary);
		font-size: 0.6875rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.event-row[data-severity='warn'] .event-row__type {
		background: hsl(var(--hsl-warning) / 0.13);
		color: hsl(var(--hsl-warning));
	}
	.event-row[data-severity='error'] .event-row__type {
		background: hsl(var(--hsl-negative) / 0.13);
		color: hsl(var(--hsl-negative));
	}

	.event-row__reason {
		grid-column: reason;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		font-size: 0.75rem;
		padding-top: 0.075rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-row__msg {
		grid-column: msg;
		white-space: pre-wrap;
		word-break: break-word;
		min-width: 0;
	}

	.events-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		min-height: 18rem;
		padding: 3rem 1rem;
		color: hsl(var(--hsl-content) / 0.5);
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
	}

	.events-empty__rings {
		position: relative;
		width: 2.25rem;
		height: 2.25rem;
	}

	.events-empty__rings::before,
	.events-empty__rings::after,
	.events-empty__core {
		position: absolute;
		border-radius: 50%;
	}

	.events-empty__rings::before {
		content: '';
		inset: 0;
		border: 1px solid hsl(var(--hsl-content) / 0.12);
		animation: ring 2.4s ease-out infinite;
	}
	.events-empty__rings::after {
		content: '';
		inset: 0;
		border: 1px solid hsl(var(--hsl-content) / 0.18);
		animation: ring 2.4s ease-out infinite;
		animation-delay: 1.2s;
	}
	.events-empty__core {
		left: 50%;
		top: 50%;
		width: 0.55rem;
		height: 0.55rem;
		margin: -0.275rem 0 0 -0.275rem;
		background: hsl(var(--hsl-content) / 0.35);
		animation: empty-pulse 1.6s ease-in-out infinite;
	}

	@keyframes ring {
		0%   { transform: scale(0.4); opacity: 1; }
		100% { transform: scale(1.4); opacity: 0; }
	}
	@keyframes empty-pulse {
		0%, 100% { opacity: 0.4; }
		50%      { opacity: 1; }
	}

	.events-empty__label {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.events-empty__hint {
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.35);
	}

	@media (max-width: 768px) {
		.event-row {
			grid-template-columns:
				[time]   2.75rem
				[mark]   2px
				[type]   4.5rem
				[reason] 8rem
				[msg]    1fr;
			column-gap: 0.4rem;
			padding: 0.2rem 0.5rem;
			font-size: 0.75rem;
		}
	}
</style>

<div class="events-shell">
	<header class="events-rail">
		<h6 class="events-rail__brand">Events</h6>

		<div class="events-rail__stats">
			<span class="stat" title={lastFetchOk ? 'auto-refreshing' : 'connecting'}>
				<span class="stat-dot" data-state={lastFetchOk ? 'live' : 'cold'}></span>
				<span class="stat__value">{lastFetchOk ? 'Polling' : 'Connecting'}</span>
				<span class="stat__unit">· {POLL_INTERVAL_MS / 1000}s</span>
			</span>

			<span class="stat" title="time since last refresh">
				<span class="stat__value">{pollText}</span>
			</span>

			{#if events.length > 0}
				<span class="stat-count" data-tone="normal" title="normal events">
					<span class="stat-count__num">{counts.normal}</span> normal
				</span>
				{#if counts.warn > 0}
					<span class="stat-count" data-tone="warn" title="warning events">
						<span class="stat-count__num">{counts.warn}</span> warn
					</span>
				{/if}
				{#if counts.error > 0}
					<span class="stat-count" data-tone="error" title="error events">
						<span class="stat-count__num">{counts.error}</span> error
					</span>
				{/if}
			{/if}
		</div>
	</header>

	<main class="events-surface">
		{#if events.length === 0}
			<div class="events-empty">
				<div class="events-empty__rings"><span class="events-empty__core"></span></div>
				<div class="events-empty__label">No Events</div>
				<div class="events-empty__hint">
					{lastFetchOk ? 'cluster is quiet · refreshing every ' + (POLL_INTERVAL_MS / 1000) + 's' : 'connecting…'}
				</div>
			</div>
		{:else}
			<ol class="events-list">
				{#each events as ev, i (i)}
					<li class="event-row" data-severity={severityOf(ev.type)}>
						<span class="event-row__time" title={ev.lastSeen}>
							{relTime(ev.lastSeen, now)}
						</span>
						<span class="event-row__mark" aria-hidden="true"></span>
						<span class="event-row__type">{ev.type}</span>
						<span class="event-row__reason" title={ev.reason}>{stripPods(ev.reason)}</span>
						<span class="event-row__msg" title={ev.message}>{stripPods(ev.message)}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</main>
</div>
