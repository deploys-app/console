<script>
	import { onMount, getContext } from 'svelte'
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip } from '$lib/permission'

	/** @type {{ can: (p: string) => boolean }} */
	const { can } = getContext('permission')

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

	// The currently running revision — the page renders revisions newest-first
	// and marks index 0 as Active.
	const activeRevision = $derived(revisions[0])

	// Rollback confirmation modal. An in-page modal (not modal.confirm) so the
	// user sees exactly what changes hands: the active revision they're leaving
	// and the revision whose image + configuration will be redeployed. Both
	// carry user-provided content (image refs), which Svelte interpolation
	// escapes for free.
	let rollbackTarget = $state(/** @type {?Api.Deployment} */ (null))
	let rollingBack = $state(false)

	// Full spec of the rollback target (deployment.get with revision returns
	// the historical spec), fetched when the modal opens so the diff below the
	// comparison cards can show exactly which configuration changes hands.
	let targetSpec = $state(/** @type {?Api.Deployment} */ (null))
	let targetLoading = $state(false)

	/** @param {Api.Deployment} it */
	function rollback (it) {
		rollbackTarget = it
		loadTargetSpec(it.revision)
	}

	/** @param {number} revision */
	async function loadTargetSpec (revision) {
		targetSpec = null
		targetLoading = true
		try {
			/** @type {Api.Response<Api.Deployment>} */
			const resp = await api.invoke('deployment.get', {
				project: deployment.project,
				location: deployment.location,
				name: deployment.name,
				revision
			}, fetch)
			// Stale guard: the user may have switched targets while this was in
			// flight.
			if (resp.ok && rollbackTarget?.revision === revision) {
				targetSpec = resp.result ?? null
			}
		} finally {
			targetLoading = false
		}
	}

	/**
	 * @param {string[]} [xs]
	 * @returns {string}
	 */
	function joinOrDash (xs) {
		return xs?.length ? xs.join(' ') : '—'
	}

	// Settings that rollback will change, current → target. Image is omitted —
	// the comparison cards above already show it side by side.
	const specChanges = $derived.by(() => {
		const t = targetSpec
		if (!t) return []
		/** @type {{ label: string, from: string, to: string }[]} */
		const rows = []
		/**
		 * @param {string} label
		 * @param {string} from
		 * @param {string} to
		 */
		const add = (label, from, to) => {
			if (from !== to) rows.push({ label, from, to })
		}
		add('Type', deployment.type, t.type)
		add('Port', String(deployment.port || '—'), String(t.port || '—'))
		add('Scaling', `${deployment.minReplicas}–${deployment.maxReplicas} replicas`, `${t.minReplicas}–${t.maxReplicas} replicas`)
		add('Schedule', deployment.schedule || '—', t.schedule || '—')
		add('Command', joinOrDash(deployment.command), joinOrDash(t.command))
		add('Args', joinOrDash(deployment.args), joinOrDash(t.args))
		add('Env groups', deployment.envGroups?.join(', ') || '—', t.envGroups?.join(', ') || '—')
		add('Workload identity', deployment.workloadIdentity || '—', t.workloadIdentity || '—')
		add('Pull secret', deployment.pullSecret || '—', t.pullSecret || '—')
		add('Disk',
			deployment.disk ? `${deployment.disk.name} @ ${deployment.disk.mountPath}` : '—',
			t.disk ? `${t.disk.name} @ ${t.disk.mountPath}` : '—')
		add('Memory', deployment.resources?.requests?.memory || '—', t.resources?.requests?.memory || '—')
		return rows
	})

	// Per-key env diff, current → target.
	const envChanges = $derived.by(() => {
		const t = targetSpec
		if (!t) return []
		const from = deployment.env ?? {}
		const to = t.env ?? {}
		const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()
		/** @type {{ key: string, kind: 'added' | 'removed' | 'changed', from: string, to: string }[]} */
		const rows = []
		for (const key of keys) {
			const a = from[key]
			const b = to[key]
			if (a === b) continue
			if (a === undefined) rows.push({ key, kind: 'added', from: '', to: b })
			else if (b === undefined) rows.push({ key, kind: 'removed', from: a, to: '' })
			else rows.push({ key, kind: 'changed', from: a, to: b })
		}
		return rows
	})

	const hasChanges = $derived(specChanges.length > 0 || envChanges.length > 0)

	function closeRollback () {
		if (rollingBack) return
		rollbackTarget = null
		targetSpec = null
	}

	/**
	 * Close only on a true backdrop click, not on clicks inside the panel.
	 * @param {MouseEvent} e
	 */
	function onRollbackBackdrop (e) {
		if (e.target === e.currentTarget) closeRollback()
	}

	async function confirmRollback () {
		if (rollingBack || !rollbackTarget) return
		rollingBack = true
		try {
			const resp = await api.invoke('deployment.rollback', {
				project: deployment.project,
				location: deployment.location,
				name: deployment.name,
				revision: rollbackTarget.revision
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			rollbackTarget = null
			goto(`/deployment/detail?project=${deployment.project}&location=${deployment.location}&name=${deployment.name}`)
		} finally {
			rollingBack = false
		}
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
		margin: 0;
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

	.rb-compare {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: stretch;
		gap: 0.75rem;
	}

	.rb-side {
		min-width: 0;
		padding: 0.75rem 0.9rem;
		border: 1px solid hsl(var(--hsl-content) / 0.1);
		border-radius: 8px;
		background: hsl(var(--hsl-content) / 0.03);
	}

	.rb-side[data-kind='to'] {
		border-color: hsl(var(--hsl-primary) / 0.35);
		background: hsl(var(--hsl-primary) / 0.06);
	}

	.rb-side__label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.rb-side[data-kind='to'] .rb-side__label {
		color: hsl(var(--hsl-primary));
	}

	.rb-side__rev {
		margin-top: 0.25rem;
		font-family: var(--ffml-mono);
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.rb-side[data-kind='to'] .rb-side__rev {
		color: hsl(var(--hsl-primary));
	}

	.rb-side__image {
		margin-top: 0.35rem;
		font-size: 0.8125rem;
		overflow-wrap: anywhere;
	}

	.rb-side__meta {
		margin-top: 0.35rem;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.5);
	}

	.rb-arrow {
		align-self: center;
		color: hsl(var(--hsl-content) / 0.35);
	}

	@media (max-width: 640px) {
		.rb-compare { grid-template-columns: 1fr; }
		.rb-arrow { transform: rotate(90deg); justify-self: center; }
	}

	/* Roomier panel: the diff table needs width, and the whole panel scrolls
	   when the diff is long. */
	.modal-panel {
		width: 100%;
		max-width: 56rem;
		max-height: calc(100dvh - 3rem);
		overflow-y: auto;
	}

	.rb-diff__head { margin-bottom: 0.75rem; }

	.rb-diff__table {
		max-height: 19rem;
		overflow-y: auto;
	}

	.rb-diff__field {
		font-weight: 600;
		white-space: nowrap;
	}

	.rb-diff__from { color: hsl(var(--hsl-content) / 0.55); }
	.rb-diff__from, .rb-diff__to { overflow-wrap: anywhere; }

	.rb-env-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		margin-right: 0.4rem;
		border-radius: 4px;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		font-weight: 700;
		color: hsl(var(--hsl-content) / 0.6);
		background: hsl(var(--hsl-content) / 0.08);
	}

	.rb-env-badge[data-kind='added'] {
		color: hsl(var(--hsl-positive));
		background: hsl(var(--hsl-positive) / 0.12);
	}

	.rb-env-badge[data-kind='removed'] {
		color: hsl(var(--hsl-negative));
		background: hsl(var(--hsl-negative) / 0.12);
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
		<h6 class="rev-rail__brand">Revisions</h6>

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
						<span class="inline-flex" title={can('deployment.deploy') ? null : denyTooltip('deployment.deploy')}>
							<button type="button" class="rail-btn"
								disabled={!can('deployment.deploy')}
								onclick={() => rollback(it)}>
								<i class="fa-solid fa-rotate-left"></i>
								Rollback
							</button>
						</span>
					{/if}
				</span>
			</li>
		{/each}
	</ol>
</div>

<!-- Rollback confirmation: spells out what's being rolled back — the revision
     being left and the revision whose image + configuration will be redeployed
     as a new revision. -->
<div class="modal" onclick={onRollbackBackdrop} class:is-active={!!rollbackTarget} aria-hidden={!rollbackTarget}>
	<div class="modal-panel">
		<div class="modal-close" onclick={closeRollback} onkeypress={closeRollback} tabindex="0" role="button">✕</div>
		<h4><strong>Rollback {deployment.name}?</strong></h4>

		{#if rollbackTarget}
			<div class="rb-compare mt-5">
				<div class="rb-side" data-kind="from">
					<div class="rb-side__label">Currently active</div>
					<div class="rb-side__rev">#{activeRevision?.revision ?? deployment.revision}</div>
					{#if activeRevision}
						<div class="rb-side__image font-mono" title={activeRevision.image}>{activeRevision.image}</div>
						<div class="rb-side__meta" title={activeRevision.createdAt}>
							deployed {format.datetime(activeRevision.createdAt)} by {activeRevision.createdBy}
						</div>
					{/if}
				</div>
				<div class="rb-arrow" aria-hidden="true">
					<i class="fa-solid fa-arrow-right"></i>
				</div>
				<div class="rb-side" data-kind="to">
					<div class="rb-side__label">Rolling back to</div>
					<div class="rb-side__rev">#{rollbackTarget.revision}</div>
					<div class="rb-side__image font-mono" title={rollbackTarget.image}>{rollbackTarget.image}</div>
					<div class="rb-side__meta" title={rollbackTarget.createdAt}>
						deployed {format.datetime(rollbackTarget.createdAt)} by {rollbackTarget.createdBy}
					</div>
				</div>
			</div>

			<div class="rb-diff mt-5">
				<div class="rb-diff__head">
					<h6><strong>Configuration changes</strong></h6>
					<p class="text-content/50 text-sm mt-1">
						What changes when revision #{rollbackTarget.revision}’s configuration is reapplied.
					</p>
				</div>

				{#if targetLoading}
					<p class="text-content/50 text-sm"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading revision #{rollbackTarget.revision}…</p>
				{:else if !targetSpec}
					<p class="text-content/50 text-sm">Couldn’t load revision #{rollbackTarget.revision}’s configuration — only the image comparison above is shown.</p>
				{:else if !hasChanges}
					<p class="text-content/50 text-sm">
						<i class="fa-solid fa-circle-check mr-2 text-positive"></i>
						Same configuration — only the image differs.
					</p>
				{:else}
					<div class="table-container rb-diff__table">
						<table class="table is-variant-compact">
							<thead>
								<tr>
									<th>Setting</th>
									<th>Current</th>
									<th>After rollback</th>
								</tr>
							</thead>
							<tbody>
								{#each specChanges as c (c.label)}
									<tr>
										<td class="rb-diff__field">{c.label}</td>
										<td class="font-mono text-sm rb-diff__from">{c.from}</td>
										<td class="font-mono text-sm rb-diff__to">{c.to}</td>
									</tr>
								{/each}
								{#each envChanges as c (c.key)}
									<tr>
										<td class="rb-diff__field">
											<span class="rb-env-badge" data-kind={c.kind}>
												{c.kind === 'added' ? '+' : c.kind === 'removed' ? '−' : '±'}
											</span>
											<span class="font-mono text-sm">{c.key}</span>
										</td>
										<td class="font-mono text-sm rb-diff__from">{c.kind === 'added' ? '—' : c.from}</td>
										<td class="font-mono text-sm rb-diff__to">{c.kind === 'removed' ? '—' : c.to}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<p class="text-content/60 text-sm mt-4">
				This redeploys revision <strong>#{rollbackTarget.revision}</strong>’s image and
				configuration (env, scaling, command, disks, schedule) as a new revision.
				Sidecars and mounted files keep their current configuration. No history is
				deleted.
			</p>
		{/if}

		<div class="flex items-center gap-3 mt-6">
			<GuardedButton permission="deployment.deploy" class="button"
				loading={rollingBack} onclick={confirmRollback}>
				<i class="fa-solid fa-rotate-left mr-2"></i>
				Rollback
			</GuardedButton>
			<button type="button" class="button is-variant-secondary" disabled={rollingBack}
				onclick={closeRollback}>Cancel</button>
		</div>
	</div>
</div>
