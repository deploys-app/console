<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Deployment} deployment
	 * @property {() => void} invalidate
	 */

	/** @type {Props} */
	const { deployment, invalidate } = $props()

	const project = $derived($page.data.project)

	const canPause = $derived(deployment.status === 'success' && deployment.action === 'deploy')
	const canResume = $derived(deployment.status === 'success' && deployment.action === 'pause')

	const statusTone = $derived(
		deployment.status === 'success' && deployment.action === 'pause'
			? 'warn'
			: deployment.status === 'success'
				? 'positive'
				: deployment.status === 'pending'
					? 'warn'
					: 'negative'
	)

	const statusLabel = $derived.by(() => {
		if (deployment.action === 'pause') return 'PAUSED'
		if (deployment.action === 'delete') return 'DELETING'
		return deployment.status.toUpperCase()
	})

	function pause () {
		modal.confirm({
			title: `Pause ${deployment.name} in ${deployment.location}?`,
			yes: 'Pause',
			callback: async () => {
				const resp = await api.invoke('deployment.pause', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				invalidate?.()
			}
		})
	}

	function resume () {
		modal.confirm({
			title: `Resume ${deployment.name} in ${deployment.location}?`,
			yes: 'Resume',
			callback: async () => {
				const resp = await api.invoke('deployment.resume', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				invalidate?.()
			}
		})
	}
</script>

<style>
	.masthead {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 10px;
		box-shadow:
			inset 0 1px 0 hsl(var(--hsl-content) / 0.04),
			0 1px 2px hsl(var(--hsl-content) / 0.04);
		margin-bottom: 1.5rem;
	}

	.masthead__top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.masthead__identity {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		min-width: 0;
		flex: 1;
	}

	.masthead__icon {
		font-size: 1.35rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding-top: 0.2rem;
	}

	.masthead__title-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.masthead__title {
		font-family: var(--ffml-primary);
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
		color: hsl(var(--hsl-content));
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
		margin: 0;
	}

	.masthead__image {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
		overflow-wrap: anywhere;
		word-break: break-all;
	}

	.masthead__actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	/* compact secondary pill matching the rail aesthetic */
	.mast-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.12);
		border-radius: 6px;
		padding: 0 0.85rem;
		height: 2rem;
		color: hsl(var(--hsl-content) / 0.85);
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}
	.mast-btn:hover {
		background: hsl(var(--hsl-content) / 0.05);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.2);
	}
	.mast-btn.is-primary {
		background: hsl(var(--hsl-primary));
		border-color: hsl(var(--hsl-primary));
		color: hsl(var(--hsl-primary-content));
	}
	.mast-btn.is-primary:hover {
		background: hsl(var(--hsl-primary) / 0.92);
		border-color: hsl(var(--hsl-primary) / 0.92);
	}

	/* meta strip — small caps key/value chips */
	.masthead__meta {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
		padding-top: 0.6rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.06);
	}

	.meta {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		font-family: var(--ffml-mono);
		min-width: 0;
	}

	.meta__label {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: hsl(var(--hsl-content) / 0.4);
	}

	.meta__value {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		font-variant-numeric: tabular-nums;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta__dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: hsl(var(--hsl-content) / 0.4);
	}
	.meta__dot[data-tone='positive'] {
		background: hsl(var(--hsl-positive));
		animation: live-pulse 1.8s ease-out infinite;
	}
	.meta__dot[data-tone='warn'] { background: hsl(var(--hsl-warning)); }
	.meta__dot[data-tone='negative'] { background: hsl(var(--hsl-negative)); }

	@keyframes live-pulse {
		0%, 100% { box-shadow: 0 0 0 0 hsl(var(--hsl-positive) / 0.55); }
		60%      { box-shadow: 0 0 0 6px hsl(var(--hsl-positive) / 0); }
	}

	.meta__divider {
		width: 1px;
		height: 0.85rem;
		background: hsl(var(--hsl-content) / 0.1);
	}

	@media (max-width: 768px) {
		.masthead { padding: 0.85rem 1rem; }
		.masthead__title { font-size: 1.3rem; }
		.masthead__top { flex-direction: column; align-items: stretch; }
		.masthead__actions { width: 100%; }
		.meta__value { white-space: normal; }
	}
</style>

<div class="masthead">
	<div class="masthead__top">
		<div class="masthead__identity">
			<span class="masthead__icon">
				<DeploymentStatusIcon
					action={deployment.action}
					status={deployment.status}
					url={deployment.statusUrl}
					type={deployment.type} />
			</span>
			<div class="masthead__title-wrap">
				<h4 class="masthead__title">{deployment.name}</h4>
				<span class="masthead__image">{deployment.image}</span>
			</div>
		</div>
		<div class="masthead__actions">
			{#if canPause}
				<button class="mast-btn" type="button" onclick={pause}>
					<i class="fa-solid fa-pause"></i> Pause
				</button>
			{/if}
			{#if canResume}
				<button class="mast-btn" type="button" onclick={resume}>
					<i class="fa-solid fa-play"></i> Resume
				</button>
			{/if}
			<a class="mast-btn is-primary"
				href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
				<i class="fa-solid fa-rocket"></i> Deploy New Revision
			</a>
		</div>
	</div>

	<div class="masthead__meta">
		<span class="meta">
			<span class="meta__dot" data-tone={statusTone}></span>
			<span class="meta__label">Status</span>
			<span class="meta__value">{statusLabel}</span>
		</span>
		<span class="meta__divider"></span>
		<span class="meta">
			<span class="meta__label">Type</span>
			<span class="meta__value">
				{format.deploymentType(deployment.type)}{deployment.internal ? ' · INTERNAL' : ''}
			</span>
		</span>
		<span class="meta__divider"></span>
		<span class="meta">
			<span class="meta__label">Location</span>
			<span class="meta__value">{deployment.location}</span>
		</span>
		<span class="meta__divider"></span>
		<span class="meta">
			<span class="meta__label">Revision</span>
			<span class="meta__value">#{deployment.revision}</span>
		</span>
	</div>
</div>
