<script lang="ts">
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import Secret from '$lib/components/Secret.svelte'
	import EnvGroupModal from '$lib/components/EnvGroupModal.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const deployment = $derived(data.deployment)
	const location = $derived(data.location)

	let envGroupModal = $state<EnvGroupModal | null>(null)
	let showAllEnv = $state(false)

	async function viewEnvGroup (name: string) {
		const resp = await api.invoke<Api.EnvGroup>('envGroup.get', { project: deployment.project, name }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		envGroupModal?.open(resp.result)
	}

	const hasExternalTCPAddress = $derived(['TCPService'].includes(deployment.type))
	const hasInternalTCPAddress = $derived(['WebService', 'TCPService', 'InternalTCPService'].includes(deployment.type))

	// Static deployments reference a content-addressed release instead of a
	// container image — surface the release-sha under a "Release" label.
	const isStatic = $derived(deployment.type === 'Static')
	const release = $derived(format.releaseSha(deployment))

	// Access (Google-login gate): nil/false access => public.
	const isGated = $derived(!!deployment.access?.requireGoogleLogin)
	const isWebAccess = $derived(deployment.type === 'WebService' || deployment.type === 'Static')

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

	const envEntries = $derived(Object.entries(deployment.env || {}))
	const mountEntries = $derived(Object.entries(deployment.mountData || {}))
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

	.rail__brand {
		margin: 0;
		font-weight: 600;
		color: var(--rail-fg);
		font-size: 0.9rem;
	}

	.rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid var(--rail-divider);
	}

	.rail__actions { margin-left: auto; }

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
		font-family: var(--ffml-primary);
		font-weight: 600;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
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
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 400;
		color: hsl(var(--hsl-content) / 0.6);
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
		font-family: var(--ffml-primary);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.7);
		margin-left: 0.35rem;
	}

	.spec__inline-tag.is-warning { background: hsl(var(--hsl-warning) / 0.13); color: hsl(var(--hsl-warning)); }
	.spec__inline-tag.is-negative { background: hsl(var(--hsl-negative) / 0.13); color: hsl(var(--hsl-negative)); }

	.access-note {
		display: block;
		margin-top: 0.5rem;
		font-family: var(--ffml-primary);
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.5);
	}

	/* ─── env-group chips ─── */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		background: hsl(var(--hsl-primary) / 0.1);
		color: hsl(var(--hsl-primary));
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 500;
		border: 1px solid hsl(var(--hsl-primary) / 0.22);
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.chip:hover {
		background: hsl(var(--hsl-primary) / 0.16);
		border-color: hsl(var(--hsl-primary) / 0.42);
	}

	.chip i {
		font-size: 0.7rem;
		opacity: 0.75;
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

	/* Empty state — matches the look of the project's NoDataRow component so
	   "no env groups" / "no mounts" reads the same as any other empty list. */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 0.3rem;
		padding: 2.5rem 1rem;
	}

	.empty__icon {
		font-size: 1.5rem;
		color: hsl(var(--hsl-content) / 0.3);
		margin-bottom: 0.35rem;
	}

	.empty__msg {
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
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
		font-family: var(--ffml-primary);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
		margin-right: 0.35rem;
	}

	.show-toggle {
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
	.show-toggle:hover {
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.2);
	}

</style>

<!-- ─── DETAILS shell ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Details</h6>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__unit">Revision</span>
				<span class="stat__value">#{deployment.revision}</span>
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
				{#if (deployment.type === 'WebService' && !deployment.internal) || deployment.type === 'Static'}
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

		<!-- ─── Access ─── (web-reachable types only) -->
		{#if isWebAccess}
		<section class="section">
			<div class="section__head">
				<span class="section__title">Access</span>
				<span class="section__rule"></span>
			</div>
			<div class="spec-grid is-full">
				<div class="spec">
					<span class="spec__label">Visibility</span>
					<span class="spec__value">
						{#if isGated}
							<span class="spec__inline-tag is-warning">
								<i class="fa-solid fa-lock"></i> Google login required
							</span>
						{:else}
							<span class="spec__value is-dim">Public</span>
						{/if}
					</span>
					<span></span>
				</div>
				{#if isGated}
					<div class="spec">
						<span class="spec__label">Allowed Emails</span>
						{#if deployment.access?.allowedEmails?.length}
							<span class="spec__value is-mono">{deployment.access.allowedEmails.join(', ')}</span>
						{:else}
							<span class="spec__value is-dim">Any signed-in Google account</span>
						{/if}
						<span></span>
					</div>
					<div class="spec">
						<span class="spec__label">Allowed Domains</span>
						{#if deployment.access?.allowedDomains?.length}
							<span class="spec__value is-mono">{deployment.access.allowedDomains.join(', ')}</span>
						{:else}
							<span class="spec__value is-dim">—</span>
						{/if}
						<span></span>
					</div>
				{/if}
			</div>
			<small class="access-note">Programmatic/API clients cannot bypass this.</small>
			{#if isGated && isStatic}
				<small class="access-note">Login is enabled — edge caching is forfeited for this site.</small>
			{/if}
		</section>
		{/if}

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
				{#if isStatic}
					<div class="spec">
						<span class="spec__label">Release</span>
						{#if release}
							<span class="spec__value is-mono">{release}</span>
							<span class="spec__copy copy" data-clipboard-text={release} title="Copy release">
								<i class="fa-light fa-copy"></i>
							</span>
						{:else}
							<span class="spec__value is-dim">—</span>
							<span></span>
						{/if}
					</div>
				{:else}
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
				{/if}
				{#if deployment.type === 'CronJob'}
					<div class="spec">
						<span class="spec__label">Schedule</span>
						<span class="spec__value is-mono">{deployment.schedule}</span>
						<span></span>
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── Resources ─── (container-only; not shown for Static) -->
		{#if !isStatic}
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
		{/if}

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
				<!-- Pull secret and workload identity bind a container image to a
				     registry / GCP identity — neither applies to a Static deployment,
				     which serves a content-addressed release with no pods. -->
				{#if !isStatic}
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
				<!-- Allocated price is per running replica — a Static deployment runs
				     no replicas, so it carries no allocation cost to show. -->
				{#if !isStatic}
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
				{/if}
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

<!-- Env groups, env vars and mount data all inject configuration into a running
     container. A Static deployment has no container, so none of these apply —
     hide all three shells for it. -->
{#if !isStatic}
<!-- ─── ENV GROUPS shell ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Env Groups</h6>
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
						<button type="button" class="chip" onclick={() => viewEnvGroup(name)}>
							<i class="fa-solid fa-layer-group" aria-hidden="true"></i>
							{name}
						</button>
					{/each}
				</div>
			{:else}
				<div class="empty">
					<i class="fa-solid fa-inbox empty__icon" aria-hidden="true"></i>
					<span class="empty__msg">Nothing here yet</span>
				</div>
			{/if}
		</section>
	</div>
</div>

<!-- ─── ENV VARS shell ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Env Vars</h6>
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
				<div class="empty">
					<i class="fa-solid fa-inbox empty__icon" aria-hidden="true"></i>
					<span class="empty__msg">Nothing here yet</span>
				</div>
			{/if}
		</section>
	</div>
</div>

<!-- ─── MOUNT DATA shell ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Mount Data</h6>
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
				<div class="empty">
					<i class="fa-solid fa-inbox empty__icon" aria-hidden="true"></i>
					<span class="empty__msg">Nothing here yet</span>
				</div>
			{/if}
		</section>
	</div>
</div>
{/if}

<DangerZone description="Permanently delete this deployment. All running instances will be stopped and removed.">
	<GuardedButton permission="deployment.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
</DangerZone>

<EnvGroupModal bind:this={envGroupModal} />
