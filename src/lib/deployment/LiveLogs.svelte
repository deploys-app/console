<script lang="ts">
	import { onMount } from 'svelte'
	import { SvelteSet } from 'svelte/reactivity'
	import { podPrefixStripper } from '$lib/deployment/podName'
	import { detectSeverity, podHue, relTime, type Severity } from '$lib/deployment/logFormat'
	import type { Snippet } from 'svelte'

	// `toggle` is rendered at the start of the rail so the Live/History switch
	// sits inline with the controls (provided by the parent Logs page).
	const { deployment, toggle }: { deployment: Api.Deployment, toggle?: Snippet } = $props()

	const podLabel = $derived(podPrefixStripper(deployment))

	const MAX_LINES = 2000
	const FLUSH_INTERVAL_MS = 500
	const THROUGHPUT_WINDOW_MS = 5000

	interface LogLine {
		id: number
		pod: string
		timestamp: string
		log: string
		severity: Severity
	}

	let lines = $state<LogLine[]>([])
	const pending: LogLine[] = []
	let nextId = 1

	const recentArrivals: number[] = []

	let paused = $state(false)
	let connected = $state(false)
	let dropped = $state(0)
	let throughput = $state(0)
	let now = $state(Date.now())
	let filter = $state('')

	const filteredIds = $derived.by(() => {
		const f = filter.trim().toLowerCase()
		if (!f) return null
		const s = new SvelteSet<number>()
		for (const l of lines) {
			if (l.log.toLowerCase().includes(f) || l.pod.toLowerCase().includes(f)) s.add(l.id)
		}
		return s
	})
	const visibleCount = $derived(filteredIds ? filteredIds.size : lines.length)

	const fillPct = $derived(Math.min(100, (lines.length / MAX_LINES) * 100))
	const fillState = $derived(fillPct < 60 ? 'low' : fillPct < 90 ? 'mid' : 'high')

	const statusState = $derived(paused ? 'paused' : connected ? 'live' : 'reconnecting')
	const statusLabel = $derived(paused ? 'Paused' : connected ? 'Live' : 'Connecting')

	const throughputText = $derived.by(() => {
		if (throughput < 10) return throughput.toFixed(1)
		return Math.round(throughput).toString()
	})

	onMount(() => {
		if (!deployment.logUrl) return

		const source = new EventSource(deployment.logUrl)
		source.addEventListener('open', () => {
			connected = true
			pending.length = 0
			lines = []
			dropped = 0
			recentArrivals.length = 0
		})
		source.addEventListener('error', () => {
			connected = false
		})
		source.addEventListener('message', (ev) => {
			try {
				const d = JSON.parse(ev.data)
				pending.push({
					id: nextId++,
					pod: d.pod,
					timestamp: d.timestamp,
					log: d.log,
					severity: detectSeverity(d.log)
				})
				recentArrivals.push(Date.now())
				if (pending.length > MAX_LINES) {
					const overflow = pending.length - MAX_LINES
					pending.splice(0, overflow)
					dropped += overflow
				}
			} catch (err) {
				console.error(err)
			}
		})

		const interval = setInterval(() => {
			const cutoff = Date.now() - THROUGHPUT_WINDOW_MS
			while (recentArrivals.length && recentArrivals[0] < cutoff) recentArrivals.shift()
			throughput = recentArrivals.length / (THROUGHPUT_WINDOW_MS / 1000)
			now = Date.now()

			if (paused) return
			if (pending.length === 0) return
			const incoming = pending.slice().reverse()
			pending.length = 0
			const merged = incoming.concat(lines)
			if (merged.length > MAX_LINES) {
				dropped += merged.length - MAX_LINES
				merged.length = MAX_LINES
			}
			lines = merged
		}, FLUSH_INTERVAL_MS)

		return () => {
			source.close()
			clearInterval(interval)
		}
	})

	function togglePause () { paused = !paused }
	function clearLines () {
		lines = []
		pending.length = 0
		dropped = 0
	}
	function clearFilter () { filter = '' }
</script>

<style>
	.log-shell {
		--rail-fg: hsl(var(--hsl-content));
		--rail-fg-muted: hsl(var(--hsl-content) / 0.5);
		--rail-fg-dim: hsl(var(--hsl-content) / 0.32);
		--rail-divider: hsl(var(--hsl-content) / 0.08);
		--surface-bg: hsl(var(--hsl-base-100));
		--surface-scan: hsl(var(--hsl-content) / 0.018);
		--row-hover: hsl(var(--hsl-content) / 0.04);

		display: flex;
		flex-direction: column;
		background: var(--surface-bg);
		border: 1px solid var(--rail-divider);
		border-radius: 10px;
		overflow: hidden;
		font-feature-settings: 'tnum' 1, 'ss02' 1;
		box-shadow:
			0 1px 0 hsl(var(--hsl-content) / 0.03) inset,
			0 0 0 1px hsl(var(--hsl-content) / 0.015);
	}

	.log-rail {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--rail-divider);
		background: linear-gradient(180deg, hsl(var(--hsl-base-200)) 0%, hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-primary);
		flex-wrap: wrap;
	}

	.log-rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid var(--rail-divider);
		flex-wrap: wrap;
	}

	.stat { display: inline-flex; align-items: baseline; gap: 0.35rem; color: var(--rail-fg-muted); font-size: 0.8125rem; }
	.stat__value { color: var(--rail-fg); font-variant-numeric: tabular-nums; font-weight: 600; }
	.stat__unit { color: var(--rail-fg-muted); font-size: 0.625rem; }
	.stat__dropped { color: hsl(var(--hsl-negative) / 0.85); font-size: 0.75rem; font-weight: 500; margin-left: 0.25rem; }

	.stat-dot { position: relative; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: hsl(var(--hsl-content) / 0.4); flex-shrink: 0; }
	.stat-dot[data-state='live'] { background: hsl(var(--hsl-positive)); animation: live-pulse 1.8s ease-out infinite; }
	.stat-dot[data-state='paused'] { background: hsl(var(--hsl-warning)); }
	.stat-dot[data-state='reconnecting'] { background: hsl(var(--hsl-content) / 0.45); animation: dim-blink 1.2s ease-in-out infinite; }

	@keyframes live-pulse { 0%, 100% { box-shadow: 0 0 0 0 hsl(var(--hsl-positive) / 0.55); } 60% { box-shadow: 0 0 0 6px hsl(var(--hsl-positive) / 0); } }
	@keyframes dim-blink { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

	.buffer-bar { position: relative; width: 56px; height: 4px; background: hsl(var(--hsl-content) / 0.08); border-radius: 2px; overflow: hidden; margin-left: 0.25rem; }
	.buffer-bar__fill { position: absolute; inset: 0 auto 0 0; background: hsl(var(--hsl-positive)); transition: width 0.35s ease-out, background-color 0.35s ease-out; }
	.buffer-bar[data-state='mid'] .buffer-bar__fill { background: hsl(var(--hsl-warning)); }
	.buffer-bar[data-state='high'] .buffer-bar__fill { background: hsl(var(--hsl-negative)); }

	.log-rail__actions { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }

	.log-filter { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0 0.55rem; height: 1.75rem; background: hsl(var(--hsl-content) / 0.04); border: 1px solid hsl(var(--hsl-content) / 0.08); border-radius: 6px; transition: border-color 0.15s ease, background 0.15s ease; }
	.log-filter:focus-within { border-color: hsl(var(--hsl-primary) / 0.5); background: hsl(var(--hsl-base-100)); box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08); }
	.log-filter__icon { font-size: 0.625rem; color: var(--rail-fg-dim); }
	.log-filter__input { background: transparent; border: none; outline: none; font-family: var(--ffml-mono); font-size: 0.75rem; color: var(--rail-fg); width: 11rem; }
	.log-filter__input::placeholder { color: var(--rail-fg-dim); letter-spacing: 0.04em; }
	.log-filter__clear { background: transparent; border: none; padding: 0 0.1rem; color: var(--rail-fg-dim); cursor: pointer; font-size: 0.625rem; }
	.log-filter__clear:hover { color: var(--rail-fg); }

	.rail-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: transparent; border: 1px solid hsl(var(--hsl-content) / 0.15); border-radius: 6px; padding: 0 0.75rem; height: 1.75rem; color: hsl(var(--hsl-content)); font-family: var(--ffml-primary); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; text-decoration: none; }
	.rail-btn:hover { background: hsl(var(--hsl-content) / 0.06); color: var(--rail-fg); border-color: hsl(var(--hsl-content) / 0.18); }
	.rail-btn[data-active='true'] { border-color: hsl(var(--hsl-warning) / 0.55); color: hsl(var(--hsl-warning)); background: hsl(var(--hsl-warning) / 0.1); }

	.log-surface {
		position: relative;
		flex: 1;
		min-height: 14rem;
		max-height: calc(100dvh - 31rem);
		overflow-y: auto;
		overflow-x: hidden;
		isolation: isolate;
		background:
			repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.5rem - 1px), var(--surface-scan) calc(1.5rem - 1px), var(--surface-scan) 1.5rem),
			var(--surface-bg);
	}
	.log-surface[data-paused='true']::after { content: ''; position: absolute; inset: 0; background: hsl(var(--hsl-base-100) / 0.4); pointer-events: none; z-index: 2; }
	.log-surface__veil { position: sticky; top: 0; height: 1.25rem; background: linear-gradient(180deg, hsl(var(--hsl-base-100)) 0%, hsl(var(--hsl-base-100) / 0) 100%); pointer-events: none; z-index: 1; margin-bottom: -1.25rem; }

	.log-list { list-style: none; margin: 0; padding: 0.25rem 0 0.5rem; font-family: var(--ffml-mono); font-size: 0.8125rem; }
	.log-row { display: grid; grid-template-columns: [time] 3.25rem [mark] 2px [pod] 10rem [msg] 1fr; align-items: start; column-gap: 0.65rem; padding: 0.125rem 1rem; line-height: 1.5; color: hsl(var(--hsl-content) / 0.92); transition: background-color 0.12s ease; animation: row-in 0.22s ease-out; position: relative; }
	.log-row.is-hidden { display: none; }
	.log-row:hover { background: var(--row-hover); }
	@keyframes row-in { from { transform: translateY(-2px); opacity: 0; } to { transform: none; opacity: 1; } }
	.log-row__time { grid-column: time; color: hsl(var(--hsl-content) / 0.42); font-variant-numeric: tabular-nums; text-align: right; font-size: 0.6875rem; padding-top: 0.075rem; cursor: help; }
	.log-row__mark { grid-column: mark; align-self: stretch; background: transparent; border-radius: 2px; margin: 0.1rem 0; }
	.log-row[data-severity='error'] .log-row__mark { background: hsl(var(--hsl-negative)); }
	.log-row[data-severity='warn'] .log-row__mark { background: hsl(var(--hsl-warning)); }
	.log-row[data-severity='error'] { background: hsl(var(--hsl-negative) / 0.045); }
	.log-row[data-severity='error']:hover { background: hsl(var(--hsl-negative) / 0.085); }
	.log-row[data-severity='error'] .log-row__msg { color: hsl(var(--hsl-content)); }
	.log-row[data-severity='warn'] .log-row__msg { color: hsl(var(--hsl-content)); }
	.log-row[data-severity='debug'] { color: hsl(var(--hsl-content) / 0.5); }
	.log-row__pod { grid-column: pod; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0 0.45rem; height: 1.1rem; align-self: center; border-radius: 3px; background: hsl(var(--pod-h), 60%, 50%, 0.13); color: hsl(var(--pod-h), 65%, 38%); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; max-width: 100%; }
	.log-row__pod::before { content: ''; width: 0.3rem; height: 0.3rem; border-radius: 50%; background: hsl(var(--pod-h), 65%, 50%); flex-shrink: 0; }
	:global(.dark) .log-row__pod { color: hsl(var(--pod-h), 75%, 75%); background: hsl(var(--pod-h), 65%, 60%, 0.16); }
	:global(.dark) .log-row__pod::before { background: hsl(var(--pod-h), 70%, 65%); }
	.log-row__msg { grid-column: msg; white-space: pre-wrap; word-break: break-word; min-width: 0; }

	.log-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; min-height: 18rem; padding: 3rem 1rem; color: hsl(var(--hsl-content) / 0.5); font-family: var(--ffml-mono); font-size: 0.8125rem; }
	.log-empty__core { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: hsl(var(--hsl-content) / 0.35); animation: empty-pulse 1.6s ease-in-out infinite; }
	@keyframes empty-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
	.log-empty__label { font-size: 0.875rem; font-weight: 600; color: hsl(var(--hsl-content) / 0.65); }
	.log-empty__hint { font-size: 0.8125rem; color: hsl(var(--hsl-content) / 0.45); }

	@media (max-width: 768px) {
		.log-row { grid-template-columns: [time] 2.75rem [mark] 2px [pod] 6.5rem [msg] 1fr; column-gap: 0.4rem; padding: 0.125rem 0.5rem; font-size: 0.75rem; }
		.log-filter__input { width: 6rem; }
	}
</style>

<div class="log-shell">
	<header class="log-rail">
		{@render toggle?.()}

		<div class="log-rail__stats">
			<span class="stat" title={statusLabel.toLowerCase()}>
				<span class="stat-dot" data-state={statusState}></span>
				<span class="stat__value">{statusLabel}</span>
			</span>
			<span class="stat" title="lines per second (5s avg)">
				<span class="stat__value">{throughputText}</span>
				<span class="stat__unit">l/s</span>
			</span>
			<span class="stat" title="buffered lines (cap {MAX_LINES})">
				<span class="stat__value">{lines.length}</span>
				<span class="stat__unit">/ {MAX_LINES}</span>
				<span class="buffer-bar" data-state={fillState}>
					<span class="buffer-bar__fill" style:width="{fillPct}%"></span>
				</span>
				{#if dropped > 0}
					<span class="stat__dropped" title="lines dropped past cap">−{dropped}</span>
				{/if}
			</span>
		</div>

		<div class="log-rail__actions">
			<label class="log-filter">
				<i class="fa-solid fa-magnifying-glass log-filter__icon" aria-hidden="true"></i>
				<input class="log-filter__input" type="text" placeholder="filter…"
					aria-label="Filter log lines"
					bind:value={filter} spellcheck="false" autocomplete="off">
				{#if filter}
					<button type="button" class="log-filter__clear" onclick={clearFilter} aria-label="Clear filter">
						<i class="fa-solid fa-xmark"></i>
					</button>
				{/if}
			</label>

			<button type="button" class="rail-btn" data-active={paused} aria-pressed={paused} onclick={togglePause}>
				{#if paused}<i class="fa-solid fa-play"></i> Resume{:else}<i class="fa-solid fa-pause"></i> Pause{/if}
			</button>

			<button type="button" class="rail-btn" onclick={clearLines}>
				<i class="fa-regular fa-trash-can"></i> Clear
			</button>

			<a class="rail-btn" href={`${deployment.logUrl}&type=text&raw=1`} target="_blank" rel="noopener">
				<i class="fa-solid fa-arrow-up-right-from-square"></i> Raw
			</a>
		</div>
	</header>

	<main class="log-surface" data-paused={paused} id="js-logs">
		<div class="log-surface__veil" aria-hidden="true"></div>

		{#if lines.length === 0}
			<div class="log-empty">
				<span class="log-empty__core"></span>
				<div class="log-empty__label">Awaiting Log Stream</div>
				<div class="log-empty__hint">{connected ? 'connection open · no output yet' : 'connecting…'}</div>
			</div>
		{:else if filteredIds && visibleCount === 0}
			<div class="log-empty">
				<div class="log-empty__label">No matches</div>
				<div class="log-empty__hint">{lines.length} {lines.length === 1 ? 'line' : 'lines'} buffered · nothing matches “{filter}”</div>
			</div>
		{:else}
			<ol class="log-list">
				{#each lines as line (line.id)}
					<li class="log-row" class:is-hidden={filteredIds && !filteredIds.has(line.id)} data-severity={line.severity}>
						<span class="log-row__time" title={line.timestamp}>{relTime(line.timestamp, now)}</span>
						<span class="log-row__mark" aria-hidden="true"></span>
						<span class="log-row__pod" style="--pod-h: {podHue(line.pod)}" title={line.pod}>{podLabel(line.pod)}</span>
						<span class="log-row__msg">{line.log}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</main>
</div>
