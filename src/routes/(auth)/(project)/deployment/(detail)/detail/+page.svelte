<script>
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import Secret from '$lib/components/Secret.svelte'
	import EnvGroupModal from '$lib/components/EnvGroupModal.svelte'

	const { data } = $props()

	const deployment = $derived(data.deployment)
	const location = $derived(data.location)

	/** @type {?EnvGroupModal} */
	let envGroupModal = $state(null)
	let showAllEnv = $state(false)

	/** @param {string} name */
	async function viewEnvGroup (name) {
		const resp = await api.invoke('envGroup.get', { project: deployment.project, name }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		envGroupModal?.open(resp.result)
	}

	const hasExternalTCPAddress = $derived(['TCPService'].includes(deployment.type))
	const hasInternalTCPAddress = $derived(['WebService', 'TCPService', 'InternalTCPService'].includes(deployment.type))

	onMount(() => setupCopy('.copy'))

	function deleteItem () {
		modal.confirm({
			title: `Delete "${deployment.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('deployment.delete', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/deployment?project=${deployment.project}`)
			}
		})
	}

	// Deterministic hue for env group chips, hashed from the name so the
	// same group keeps the same colour as the user navigates around.
	const CHIP_HUES = [355, 28, 48, 142, 175, 205, 260, 312]
	/** @param {string} s */
	function chipHue (s) {
		let h = 0
		for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
		return CHIP_HUES[Math.abs(h) % CHIP_HUES.length]
	}

	const envEntries = $derived(Object.entries(deployment.env || {}))
	const mountEntries = $derived(Object.entries(deployment.mountData || {}))

	const statusTone = $derived(
		deployment.status === 'success'
			? 'positive'
			: deployment.status === 'pending'
				? 'warn'
				: 'negative'
	)
</script>

<style>
	/* shared shell vars */
	.shell {
		--rail-fg: hsl(var(--hsl-content));
		--rail-fg-muted: hsl(var(--hsl-content) / 0.5);
		--rail-fg-dim: hsl(var(--hsl-content) / 0.32);
		--rail-divider: hsl(var(--hsl-content) / 0.08);
		--surface-bg: hsl(var(--hsl-base-100));

		display: flex;
		flex-direction: column;
		background: var(--surface-bg);
		border: 1px solid var(--rail-divider);
		border-radius: 10px;
		overflow: hidden;
		font-family: var(--ffml-primary);
		margin-bottom: 1rem;
	}

	.rail {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 0.5rem 0.75rem 0.5rem 1rem;
		border-bottom: 1px solid var(--rail-divider);
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-mono);
		flex-wrap: wrap;
	}

	.rail__brand {
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--rail-fg);
		font-size: 0.6875rem;
	}

	.rail__stats {
		display: flex;
		align-items: center;
		gap: 1.1rem;
		padding-left: 0.5rem;
		border-left: 1px solid var(--rail-divider);
	}

	.rail__actions { margin-left: auto; }

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--rail-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.625rem;
		font-weight: 600;
	}

	.stat__value {
		color: var(--rail-fg);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		font-size: 0.75rem;
	}

	.stat__unit { color: var(--rail-fg-dim); font-size: 0.625rem; }

	.stat-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
		background: hsl(var(--hsl-content) / 0.4);
	}
	.stat-dot[data-tone='positive'] {
		background: hsl(var(--hsl-positive));
		animation: live-pulse 1.8s ease-out infinite;
	}
	.stat-dot[data-tone='warn'] { background: hsl(var(--hsl-warning)); }
	.stat-dot[data-tone='negative'] { background: hsl(var(--hsl-negative)); }

	@keyframes live-pulse {
		0%, 100% { box-shadow: 0 0 0 0 hsl(var(--hsl-positive) / 0.55); }
		60%      { box-shadow: 0 0 0 6px hsl(var(--hsl-positive) / 0); }
	}

	/* ─── spec body ─── */
	.body {
		padding: 0.75rem 0;
	}

	.section {
		padding: 0.5rem 1rem 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.05);
	}

	.section:first-child { border-top: none; }

	.section__head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
	}

	.section__title {
		font-family: var(--ffml-mono);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.section__rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right,
			hsl(var(--hsl-content) / 0.08),
			hsl(var(--hsl-content) / 0));
	}

	.spec-grid {
		display: grid;
		grid-template-columns: 1fr;
		row-gap: 0.35rem;
	}

	@media (min-width: 1024px) {
		.spec-grid { grid-template-columns: 1fr 1fr; column-gap: 2rem; }
		.spec-grid.is-full { grid-template-columns: 1fr; }
	}

	.spec {
		display: grid;
		grid-template-columns: 10rem 1fr auto;
		align-items: baseline;
		column-gap: 0.75rem;
		padding: 0.2rem 0;
		min-width: 0;
	}

	.spec__label {
		font-family: var(--ffml-mono);
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: hsl(var(--hsl-content) / 0.45);
	}

	.spec__value {
		font-family: var(--ffml-primary);
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
		min-width: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.spec__value.is-mono {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.92);
	}

	.spec__value.is-dim { color: hsl(var(--hsl-content) / 0.45); }

	.spec__copy {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.35);
		cursor: pointer;
		padding: 0.15rem 0.3rem;
		border-radius: 3px;
		transition: color 0.15s ease, background 0.15s ease;
	}
	.spec__copy:hover {
		color: hsl(var(--hsl-content));
		background: hsl(var(--hsl-content) / 0.06);
	}

	.spec__link {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-primary));
		text-decoration: none;
		border-bottom: 1px dashed hsl(var(--hsl-primary) / 0.35);
		transition: border-color 0.15s ease;
		overflow-wrap: anywhere;
	}
	.spec__link:hover { border-bottom-color: hsl(var(--hsl-primary)); }

	.spec__inline-tag {
		display: inline-block;
		font-family: var(--ffml-mono);
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: hsl(var(--hsl-content) / 0.08);
		color: hsl(var(--hsl-content) / 0.6);
		margin-left: 0.35rem;
	}

	.spec__inline-tag.is-warning { background: hsl(var(--hsl-warning) / 0.13); color: hsl(var(--hsl-warning)); }
	.spec__inline-tag.is-negative { background: hsl(var(--hsl-negative) / 0.13); color: hsl(var(--hsl-negative)); }

	/* ─── env-group chips ─── */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.55rem;
		border-radius: 4px;
		background: hsl(var(--chip-h), 60%, 50%, 0.13);
		color: hsl(var(--chip-h), 65%, 38%);
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid hsl(var(--chip-h), 60%, 50%, 0.22);
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.chip::before {
		content: '';
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: hsl(var(--chip-h), 65%, 50%);
	}

	.chip:hover {
		background: hsl(var(--chip-h), 60%, 50%, 0.2);
		border-color: hsl(var(--chip-h), 60%, 50%, 0.4);
	}

	:global(.dark) .chip {
		color: hsl(var(--chip-h), 75%, 75%);
		background: hsl(var(--chip-h), 65%, 60%, 0.15);
		border-color: hsl(var(--chip-h), 65%, 60%, 0.28);
	}
	:global(.dark) .chip::before {
		background: hsl(var(--chip-h), 70%, 65%);
	}

	/* ─── env / mount key-value table ─── */
	.kv-list {
		display: grid;
		grid-template-columns: minmax(10rem, max-content) 1fr;
		gap: 0;
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		border: 1px solid hsl(var(--hsl-content) / 0.06);
		border-radius: 6px;
		overflow: hidden;
		background:
			repeating-linear-gradient(
				to bottom,
				transparent 0,
				transparent calc(1.6rem - 1px),
				hsl(var(--hsl-content) / 0.014) calc(1.6rem - 1px),
				hsl(var(--hsl-content) / 0.014) 1.6rem
			);
	}

	.kv-list__row {
		display: contents;
	}

	.kv-list__key,
	.kv-list__val {
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid hsl(var(--hsl-content) / 0.04);
	}

	.kv-list__row:last-child .kv-list__key,
	.kv-list__row:last-child .kv-list__val { border-bottom: none; }

	.kv-list__key {
		color: hsl(var(--hsl-content));
		font-weight: 600;
		background: hsl(var(--hsl-content) / 0.025);
		border-right: 1px solid hsl(var(--hsl-content) / 0.04);
	}

	.kv-list__val {
		color: hsl(var(--hsl-content) / 0.92);
		overflow-wrap: anywhere;
	}

	.empty {
		padding: 0.85rem 1rem;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.4);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		border: 1px dashed hsl(var(--hsl-content) / 0.1);
		border-radius: 6px;
	}

	/* sidecar list inside a spec value */
	.sidecars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidecars li {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content));
	}

	.sidecars__label {
		display: inline-block;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
		margin-right: 0.35rem;
	}

	.show-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.12);
		border-radius: 6px;
		padding: 0 0.65rem;
		height: 1.65rem;
		color: hsl(var(--hsl-content) / 0.7);
		font-family: var(--ffml-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}
	.show-toggle:hover {
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.2);
	}

</style>

<!-- ─── DETAILS shell ─── -->
<div class="shell">
	<header class="rail">
		<span class="rail__brand">Details</span>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat-dot" data-tone={statusTone}></span>
				<span class="stat__value">{deployment.status.toUpperCase()}</span>
			</span>
			<span class="stat">
				<span class="stat__value">#{deployment.revision}</span>
				<span class="stat__unit">revision</span>
			</span>
		</div>
	</header>

	<div class="body">
		<!-- ─── Network ─── -->
		<section class="section">
			<div class="section__head">
				<span class="section__title">Network</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid is-full">
				{#if deployment.type === 'WebService' && !deployment.internal}
					<div class="spec">
						<span class="spec__label">URL</span>
						<a class="spec__link" href={`https://${deployment.url}`} target="_blank" rel="noopener">
							{`https://${deployment.url}`}
						</a>
						<span class="spec__copy copy" data-clipboard-text={`https://${deployment.url}`} title="Copy URL">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/if}
				{#if deployment.type === 'WebService'}
					<div class="spec">
						<span class="spec__label">Internal URL</span>
						<span class="spec__value is-mono">http://{deployment.internalUrl}</span>
						<span class="spec__copy copy" data-clipboard-text={`http://${deployment.internalUrl}`} title="Copy">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/if}
				{#if hasExternalTCPAddress}
					<div class="spec">
						<span class="spec__label">Address</span>
						<span class="spec__value is-mono">{deployment.address}:{deployment.nodePort}</span>
						<span></span>
					</div>
				{/if}
				{#if hasInternalTCPAddress}
					<div class="spec">
						<span class="spec__label">Internal Address</span>
						<span class="spec__value is-mono">{deployment.internalAddress}:{deployment.port}</span>
						<span class="spec__copy copy" data-clipboard-text={`${deployment.internalAddress}:${deployment.port}`} title="Copy">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/if}
				{#if deployment.type === 'WebService'}
					<div class="spec">
						<span class="spec__label">Port / Protocol</span>
						<span class="spec__value is-mono">
							{deployment.port}{deployment.protocol ? ` · ${deployment.protocol}` : ''}
						</span>
						<span></span>
					</div>
				{:else if deployment.type === 'TCPService'}
					<div class="spec">
						<span class="spec__label">Port</span>
						<span class="spec__value is-mono">{deployment.port}:{deployment.nodePort}</span>
						<span></span>
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── Runtime ─── -->
		<section class="section">
			<div class="section__head">
				<span class="section__title">Runtime</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">Type</span>
					<span class="spec__value">
						{format.deploymentType(deployment.type)}
						{#if deployment.internal}
							<span class="spec__inline-tag">Internal</span>
						{/if}
					</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Image</span>
					<span class="spec__value is-mono">{deployment.image}</span>
					<span class="spec__copy copy" data-clipboard-text={deployment.image} title="Copy image">
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
				<div class="spec">
					<span class="spec__label">Command</span>
					{#if deployment.command.length}
						<span class="spec__value is-mono">{deployment.command.join(' ')}</span>
					{:else}
						<span class="spec__value is-dim">—</span>
					{/if}
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Args</span>
					{#if deployment.args.length}
						<span class="spec__value is-mono">{deployment.args.join(' ')}</span>
					{:else}
						<span class="spec__value is-dim">—</span>
					{/if}
					<span></span>
				</div>
				{#if deployment.type === 'CronJob'}
					<div class="spec">
						<span class="spec__label">Schedule</span>
						<span class="spec__value is-mono">{deployment.schedule}</span>
						<span></span>
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── Resources ─── -->
		<section class="section">
			<div class="section__head">
				<span class="section__title">Resources</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">CPU Limited</span>
					<span class="spec__value is-mono">{format.cpuLimited(deployment.resources.limits.cpu)}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Memory Allocated</span>
					<span class="spec__value is-mono">{format.memory(deployment.resources.requests.memory)}</span>
					<span></span>
				</div>
				{#if deployment.minReplicas > 0}
					<div class="spec">
						<span class="spec__label">Replicas</span>
						<span class="spec__value is-mono">
							{#if deployment.minReplicas === deployment.maxReplicas}
								{deployment.minReplicas}
							{:else}
								{deployment.minReplicas} – {deployment.maxReplicas}
							{/if}
						</span>
						<span></span>
					</div>
				{/if}
				{#if location.features.disk}
					<div class="spec">
						<span class="spec__label">Disk</span>
						{#if deployment.disk}
							<span class="spec__value is-mono">
								{deployment.disk.name}
								<span class="spec__inline-tag">mount {deployment.disk.mountPath || '-'}</span>
								{#if deployment.disk.subPath}
									<span class="spec__inline-tag">sub {deployment.disk.subPath}</span>
								{/if}
							</span>
						{:else}
							<span class="spec__value is-dim">—</span>
						{/if}
						<span></span>
					</div>
				{/if}
				{#if deployment.sidecars?.length}
					<div class="spec">
						<span class="spec__label">Sidecars</span>
						<ul class="sidecars">
							{#each deployment.sidecars as s, i (i)}
								{#if s.cloudSqlProxy}
									<li>
										<span class="sidecars__label">Cloud SQL Proxy</span>
										{s.cloudSqlProxy.instance}{#if s.cloudSqlProxy.port}:{s.cloudSqlProxy.port}{/if}
									</li>
								{/if}
							{/each}
						</ul>
						<span></span>
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── Integration ─── -->
		<section class="section">
			<div class="section__head">
				<span class="section__title">Integration</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">Location</span>
					<span class="spec__value is-mono">{deployment.location}</span>
					<span class="spec__copy copy" data-clipboard-text={deployment.location} title="Copy">
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
				<div class="spec">
					<span class="spec__label">Pull Secret</span>
					{#if deployment.pullSecret}
						<span class="spec__value is-mono">{deployment.pullSecret}</span>
					{:else}
						<span class="spec__value is-dim">—</span>
					{/if}
					<span></span>
				</div>
				{#if location.features.workloadIdentity}
					<div class="spec">
						<span class="spec__label">Workload Identity</span>
						{#if deployment.workloadIdentity}
							<span class="spec__value is-mono">{deployment.workloadIdentity}</span>
						{:else}
							<span class="spec__value is-dim">—</span>
						{/if}
						<span></span>
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── Lifecycle ─── -->
		<section class="section">
			<div class="section__head">
				<span class="section__title">Lifecycle</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">Deployed At</span>
					<span class="spec__value is-mono">{format.datetime(deployment.createdAt)}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Deployed By</span>
					<span class="spec__value is-mono">{deployment.createdBy}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Allocated Price</span>
					<span class="spec__value">
						<span class="spec__value is-mono" style="font-family: var(--ffml-mono);">
							{deployment.allocatedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
						</span>
						THB / month / replica
					</span>
					<span></span>
				</div>
				{#if deployment.ttl === -1}
					<div class="spec">
						<span class="spec__label">Auto-delete</span>
						<span class="spec__value">
							<span class="spec__inline-tag is-negative">
								<i class="fa-regular fa-clock"></i> Expired · pending deletion
							</span>
						</span>
						<span></span>
					</div>
				{:else if deployment.ttl > 0}
					<div class="spec">
						<span class="spec__label">Auto-delete</span>
						<span class="spec__value">
							<span class="spec__value is-mono">{format.ttlExpireAt(deployment.ttl)}</span>
							<span class="spec__inline-tag is-warning">
								<i class="fa-regular fa-clock"></i> in {format.duration(deployment.ttl)}
							</span>
						</span>
						<span></span>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>

<!-- ─── ENV GROUPS shell ─── -->
<div class="shell">
	<header class="rail">
		<span class="rail__brand">Env Groups</span>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__value">{(deployment.envGroups || []).length}</span>
				<span class="stat__unit">attached</span>
			</span>
		</div>
	</header>
	<div class="body">
		<section class="section">
			{#if (deployment.envGroups || []).length}
				<div class="chips">
					{#each deployment.envGroups as name (name)}
						<button type="button" class="chip"
							style="--chip-h: {chipHue(name)}"
							onclick={() => viewEnvGroup(name)}>
							{name}
						</button>
					{/each}
				</div>
			{:else}
				<div class="empty">no env groups attached</div>
			{/if}
		</section>
	</div>
</div>

<!-- ─── ENV VARS shell ─── -->
<div class="shell">
	<header class="rail">
		<span class="rail__brand">Env Vars</span>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__value">{envEntries.length}</span>
				<span class="stat__unit">{envEntries.length === 1 ? 'variable' : 'variables'}</span>
			</span>
		</div>
		{#if envEntries.length}
			<div class="rail__actions">
				<button type="button" class="show-toggle" onclick={() => showAllEnv = !showAllEnv}>
					<i class="fa-solid {showAllEnv ? 'fa-eye-slash' : 'fa-eye'}"></i>
					{showAllEnv ? 'Hide all' : 'Show all'}
				</button>
			</div>
		{/if}
	</header>
	<div class="body">
		<section class="section">
			{#if envEntries.length}
				<div class="kv-list">
					{#each envEntries as [k, v] (k)}
						<div class="kv-list__row">
							<span class="kv-list__key">{k}</span>
							<span class="kv-list__val">
								<Secret value={v} show={showAllEnv} />
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty">no environment variables</div>
			{/if}
		</section>
	</div>
</div>

<!-- ─── MOUNT DATA shell ─── -->
<div class="shell">
	<header class="rail">
		<span class="rail__brand">Mount Data</span>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__value">{mountEntries.length}</span>
				<span class="stat__unit">{mountEntries.length === 1 ? 'mount' : 'mounts'}</span>
			</span>
		</div>
	</header>
	<div class="body">
		<section class="section">
			{#if mountEntries.length}
				<div class="kv-list">
					{#each mountEntries as [k, v] (k)}
						<div class="kv-list__row">
							<span class="kv-list__key">{k}</span>
							<span class="kv-list__val" style="white-space: pre">{v}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty">no mounted data</div>
			{/if}
		</section>
	</div>
</div>

<DangerZone description="Permanently delete this deployment. All running instances will be stopped and removed.">
	<button class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</button>
</DangerZone>

<EnvGroupModal bind:this={envGroupModal} />
