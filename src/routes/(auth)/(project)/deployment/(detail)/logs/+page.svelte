<script>
	import { onMount } from 'svelte'

	const { data } = $props()

	const deployment = $derived(data.deployment)

	// Cap how many lines we keep in memory and render. Without this the
	// previous implementation accumulated every line into a single string and
	// re-prepended each event (O(n) string copy), which froze the page on
	// long-running deployments. With the cap, the rendered text node stays
	// bounded (~lines × ~200B) and the DOM update cost stays flat.
	const MAX_LINES = 2000
	// How often we flush the pending queue into the reactive state. Tighter
	// than the previous 1 s tick for snappier streaming, still loose enough
	// to batch bursty input.
	const FLUSH_INTERVAL_MS = 500

	/** @type {string[]} newest first, exactly what is rendered */
	let lines = $state([])
	/** @type {string[]} arrival order (oldest → newest); merged on flush */
	const pending = []
	let paused = $state(false)
	let connected = $state(false)
	let dropped = $state(0)

	const text = $derived(lines.join('\n'))

	onMount(() => {
		const source = new EventSource(deployment.logUrl)
		source.addEventListener('open', () => {
			connected = true
			pending.length = 0
			lines = []
			dropped = 0
		})
		source.addEventListener('error', () => {
			// EventSource auto-reconnects; surface the transient state.
			connected = false
		})
		source.addEventListener('message', (ev) => {
			try {
				const d = JSON.parse(ev.data)
				pending.push(`${d.pod} ${d.timestamp} ${d.log}`)
				// Cap pending too, so a long pause or a burst can't grow it
				// without bound while we wait for the next flush tick.
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
			if (paused) return
			if (pending.length === 0) return
			// Newest must be first to match the existing top-of-list layout.
			// `pending` is in arrival order (oldest → newest), so reverse it
			// before prepending to the existing list, then cap.
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

	function togglePause () {
		paused = !paused
	}

	function clearLines () {
		lines = []
		pending.length = 0
		dropped = 0
	}
</script>

<style>
	.log-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}

	.log-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.log-meta {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.65);
	}

	.log-status {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.65);
	}

	.log-status::before {
		content: '';
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: hsl(var(--hsl-content) / 0.35);
	}

	.log-status.is-connected::before {
		background: hsl(var(--hsl-positive));
	}

	.log-status.is-paused::before {
		background: hsl(var(--hsl-warning));
	}
</style>

<div class="log-head">
	<h6><strong>Logs</strong></h6>
	<div class="log-actions">
		<span class="log-status"
			class:is-connected={connected && !paused}
			class:is-paused={paused}>
			{paused ? 'paused' : connected ? 'live' : 'disconnected'}
		</span>
		<span class="log-meta">
			{lines.length} {lines.length === 1 ? 'line' : 'lines'}
			{#if dropped > 0}
				· {dropped} dropped
			{/if}
		</span>
		<button type="button" class="button is-variant-secondary is-size-small"
			onclick={togglePause}>{paused ? 'Resume' : 'Pause'}</button>
		<button type="button" class="button is-variant-secondary is-size-small"
			onclick={clearLines}>Clear</button>
		<a class="button is-variant-secondary is-size-small"
			href={`${deployment.logUrl}&type=text&raw=1`} target="_blank" rel="noopener">
			Raw
		</a>
	</div>
</div>
<pre class="pre-scoll" id="js-logs">{text}</pre>
