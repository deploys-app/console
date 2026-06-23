<script lang="ts">
	import { onMount } from 'svelte'
	import { SvelteSet } from 'svelte/reactivity'
	import api from '$lib/api'
	import { podPrefixStripper } from '$lib/deployment/podName'
	import { detectSeverity, podHue, relTime, type Severity } from '$lib/deployment/logFormat'
	import type { Snippet } from 'svelte'

	const { deployment, toggle }: { deployment: Api.Deployment, toggle?: Snippet } = $props()
	const podLabel = $derived(podPrefixStripper(deployment))

	const PAGE_LIMIT = 200
	const RANGES = [
		{ value: '15m', label: '15m', ms: 15 * 60_000 },
		{ value: '1h', label: '1h', ms: 60 * 60_000 },
		{ value: '6h', label: '6h', ms: 6 * 60 * 60_000 },
		{ value: '24h', label: '24h', ms: 24 * 60 * 60_000 },
		{ value: '3d', label: '3d', ms: 3 * 24 * 60 * 60_000 },
		{ value: '7d', label: '7d', ms: 7 * 24 * 60 * 60_000 },
		{ value: '30d', label: '30d', ms: 30 * 24 * 60 * 60_000 }
	]

	interface LogLine {
		id: number
		pod: string
		timestamp: string
		log: string
		severity: Severity
	}

	let range = $state('1h')
	let lines = $state<LogLine[]>([])
	let loading = $state(false)
	let loadingMore = $state(false)
	let forbidden = $state(false)
	let errorMsg = $state('')
	let nextCursor = $state('')
	let capped = $state(false)
	let filter = $state('')
	let now = $state(Date.now())
	let windowSince = ''
	let nextId = 1

	function friendlyError (msg?: string): string {
		if (!msg) return 'Could not load log history.'
		if (msg.includes('log history is not available')) return 'Log history isn’t available for this location yet.'
		if (msg.includes('observability backend')) return 'Log history is temporarily unavailable — try again shortly.'
		if (msg.includes('no logs for static')) return 'Static deployments have no container logs.'
		return msg.replace(/^api:\s*/, '')
	}

	async function loadHistory (reset: boolean): Promise<void> {
		if (reset) {
			loading = true
			errorMsg = ''
			forbidden = false
			nextCursor = ''
			capped = false
			const ms = RANGES.find((r) => r.value === range)?.ms ?? 3_600_000
			windowSince = new Date(Date.now() - ms).toISOString()
		} else {
			if (!nextCursor || loadingMore) return
			loadingMore = true
		}
		const cursor = reset ? '' : nextCursor

		try {
			const resp = await api.invoke<Api.DeploymentLogsHistoryResult>('deployment.logsHistory', {
				project: deployment.project,
				location: deployment.location,
				name: deployment.name,
				since: windowSince,
				reverse: true,
				limit: PAGE_LIMIT,
				cursor
			}, fetch)
			now = Date.now()

			if (!resp.ok) {
				if (resp.error?.forbidden) forbidden = true
				else errorMsg = friendlyError(resp.error?.message)
				if (reset) lines = []
				return
			}

			const mapped = (resp.result.lines ?? []).map((l): LogLine => ({
				id: nextId++,
				pod: l.pod,
				timestamp: l.timestamp,
				log: l.log,
				severity: detectSeverity(l.log)
			}))
			lines = reset ? mapped : [...lines, ...mapped]
			nextCursor = resp.result.nextCursor ?? ''
			capped = !!resp.result.cappedByBytes
		} finally {
			loading = false
			loadingMore = false
		}
	}

	function setRange (v: string): void {
		if (v === range) return
		range = v
		loadHistory(true)
	}

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

	onMount(() => {
		loadHistory(true)
	})
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
		box-shadow: 0 1px 0 hsl(var(--hsl-content) / 0.03) inset, 0 0 0 1px hsl(var(--hsl-content) / 0.015);
	}

	.log-rail { display: flex; align-items: center; gap: 1rem; padding: 0.55rem 1rem; border-bottom: 1px solid var(--rail-divider); background: linear-gradient(180deg, hsl(var(--hsl-base-200)) 0%, hsl(var(--hsl-base-100)) 100%); box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04); font-family: var(--ffml-primary); flex-wrap: wrap; }

	.range-pills { display: inline-flex; gap: 0.2rem; padding-left: 0.65rem; border-left: 1px solid var(--rail-divider); flex-wrap: wrap; }
	.range-pill { background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 0 0.55rem; height: 1.6rem; color: var(--rail-fg-muted); font-family: var(--ffml-primary); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
	.range-pill:hover { background: hsl(var(--hsl-content) / 0.05); color: var(--rail-fg); }
	.range-pill[data-active='true'] { background: hsl(var(--hsl-primary) / 0.1); border-color: hsl(var(--hsl-primary) / 0.4); color: hsl(var(--hsl-primary)); }

	.log-rail__actions { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }
	.log-filter { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0 0.55rem; height: 1.75rem; background: hsl(var(--hsl-content) / 0.04); border: 1px solid hsl(var(--hsl-content) / 0.08); border-radius: 6px; transition: border-color 0.15s ease, background 0.15s ease; }
	.log-filter:focus-within { border-color: hsl(var(--hsl-primary) / 0.5); background: hsl(var(--hsl-base-100)); box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08); }
	.log-filter__icon { font-size: 0.625rem; color: var(--rail-fg-dim); }
	.log-filter__input { background: transparent; border: none; outline: none; font-family: var(--ffml-mono); font-size: 0.75rem; color: var(--rail-fg); width: 11rem; }
	.log-filter__input::placeholder { color: var(--rail-fg-dim); letter-spacing: 0.04em; }
	.log-filter__clear { background: transparent; border: none; padding: 0 0.1rem; color: var(--rail-fg-dim); cursor: pointer; font-size: 0.625rem; }
	.log-filter__clear:hover { color: var(--rail-fg); }

	.rail-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: transparent; border: 1px solid hsl(var(--hsl-content) / 0.15); border-radius: 6px; padding: 0 0.75rem; height: 1.75rem; color: hsl(var(--hsl-content)); font-family: var(--ffml-primary); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
	.rail-btn:hover { background: hsl(var(--hsl-content) / 0.06); border-color: hsl(var(--hsl-content) / 0.18); }
	.rail-btn:disabled { opacity: 0.5; cursor: default; }

	.log-surface { position: relative; flex: 1; min-height: 14rem; max-height: calc(100dvh - 31rem); overflow-y: auto; overflow-x: hidden; isolation: isolate; background: repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.5rem - 1px), var(--surface-scan) calc(1.5rem - 1px), var(--surface-scan) 1.5rem), var(--surface-bg); }

	.log-list { list-style: none; margin: 0; padding: 0.25rem 0 0.5rem; font-family: var(--ffml-mono); font-size: 0.8125rem; }
	.log-row { display: grid; grid-template-columns: [time] 3.25rem [mark] 2px [pod] 10rem [msg] 1fr; align-items: start; column-gap: 0.65rem; padding: 0.125rem 1rem; line-height: 1.5; color: hsl(var(--hsl-content) / 0.92); transition: background-color 0.12s ease; position: relative; }
	.log-row.is-hidden { display: none; }
	.log-row:hover { background: var(--row-hover); }
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

	.log-foot { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.6rem 1rem; border-top: 1px solid var(--rail-divider); font-family: var(--ffml-primary); font-size: 0.8125rem; color: var(--rail-fg-muted); flex-wrap: wrap; }
	.log-foot__note { color: var(--rail-fg-dim); }

	.log-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; min-height: 16rem; padding: 3rem 1rem; color: hsl(var(--hsl-content) / 0.5); font-family: var(--ffml-mono); font-size: 0.8125rem; text-align: center; }
	.log-empty__label { font-size: 0.875rem; font-weight: 600; color: hsl(var(--hsl-content) / 0.65); }
	.log-empty__hint { font-size: 0.8125rem; color: hsl(var(--hsl-content) / 0.45); max-width: 32rem; }
	.log-empty__icon { font-size: 1.4rem; color: hsl(var(--hsl-content) / 0.3); }
	.log-empty[data-tone='error'] .log-empty__icon { color: hsl(var(--hsl-negative) / 0.6); }

	@media (max-width: 768px) {
		.log-row { grid-template-columns: [time] 2.75rem [mark] 2px [pod] 6.5rem [msg] 1fr; column-gap: 0.4rem; padding: 0.125rem 0.5rem; font-size: 0.75rem; }
		.log-filter__input { width: 6rem; }
	}

	/* Phones: a 6.5rem pod chip + time leaves the message too narrow to read, and
	   the rail's filter + range pills + Refresh overflow the shell. Stack the row
	   (time · pod over a full-width message) and let the rail actions wrap onto
	   their own full-width line. */
	@media (max-width: 640px) {
		.log-row {
			grid-template-columns: 2px auto minmax(0, 1fr);
			grid-template-areas:
				'mark time pod'
				'mark msg  msg';
			column-gap: 0.5rem;
			row-gap: 0.1rem;
			padding: 0.3rem 0.75rem;
			align-items: center;
		}
		.log-row__mark { grid-area: mark; }
		.log-row__time { grid-area: time; text-align: left; padding-top: 0; }
		.log-row__pod  { grid-area: pod; justify-self: start; }
		.log-row__msg  { grid-area: msg; }

		.log-rail__actions { width: 100%; margin-left: 0; flex-wrap: wrap; }
		.log-filter { flex: 1 1 100%; }
		.log-filter__input { flex: 1; width: auto; }
	}
</style>

<div class="log-shell">
	<header class="log-rail">
		{@render toggle?.()}

		<div class="range-pills" role="group" aria-label="Time range">
			{#each RANGES as r (r.value)}
				<button type="button" class="range-pill" data-active={range === r.value} onclick={() => setRange(r.value)}>{r.label}</button>
			{/each}
		</div>

		<div class="log-rail__actions">
			<label class="log-filter">
				<i class="fa-solid fa-magnifying-glass log-filter__icon" aria-hidden="true"></i>
				<input class="log-filter__input" type="text" placeholder="filter…"
					aria-label="Filter log lines"
					bind:value={filter} spellcheck="false" autocomplete="off">
				{#if filter}
					<button type="button" class="log-filter__clear" onclick={() => (filter = '')} aria-label="Clear filter">
						<i class="fa-solid fa-xmark"></i>
					</button>
				{/if}
			</label>

			<button type="button" class="rail-btn" disabled={loading} onclick={() => loadHistory(true)}>
				<i class="fa-solid fa-rotate-right" class:fa-spin={loading}></i> Refresh
			</button>
		</div>
	</header>

	<main class="log-surface">
		{#if forbidden}
			<div class="log-empty" data-tone="error">
				<i class="fa-solid fa-lock log-empty__icon"></i>
				<div class="log-empty__label">No access</div>
				<div class="log-empty__hint">You need the <code>deployment.logs</code> permission to read log history.</div>
			</div>
		{:else if loading && lines.length === 0}
			<div class="log-empty">
				<i class="fa-solid fa-spinner fa-spin log-empty__icon"></i>
				<div class="log-empty__label">Loading history…</div>
			</div>
		{:else if errorMsg && lines.length === 0}
			<div class="log-empty" data-tone="error">
				<i class="fa-solid fa-triangle-exclamation log-empty__icon"></i>
				<div class="log-empty__label">Couldn’t load history</div>
				<div class="log-empty__hint">{errorMsg}</div>
			</div>
		{:else if lines.length === 0}
			<div class="log-empty">
				<i class="fa-regular fa-folder-open log-empty__icon"></i>
				<div class="log-empty__label">No logs in this window</div>
				<div class="log-empty__hint">Nothing stored in the last {range}. History lags live output by up to a minute, and starts when capture was enabled.</div>
			</div>
		{:else if filteredIds && visibleCount === 0}
			<div class="log-empty">
				<div class="log-empty__label">No matches</div>
				<div class="log-empty__hint">{lines.length} {lines.length === 1 ? 'line' : 'lines'} loaded · nothing matches “{filter}”</div>
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

	{#if lines.length > 0}
		<footer class="log-foot">
			<span class="log-foot__note">
				{visibleCount}{filter ? ` / ${lines.length}` : ''} {lines.length === 1 ? 'line' : 'lines'}
				{#if capped}· server cap hit{/if}
			</span>
			{#if nextCursor}
				<button type="button" class="rail-btn" disabled={loadingMore} onclick={() => loadHistory(false)}>
					<i class="fa-solid fa-arrow-down" class:fa-spin={loadingMore}></i>
					{loadingMore ? 'Loading…' : 'Load older'}
				</button>
			{:else}
				<span class="log-foot__note">· beginning of window ·</span>
			{/if}
		</footer>
	{/if}
</div>
