<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { getContext } from 'svelte'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'
	import { denyTooltip } from '$lib/permission'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Deployment} deployment
	 * @property {() => void} invalidate
	 */

	/** @type {Props} */
	const { deployment, invalidate } = $props()

	const project = $derived($page.data.project)

	/** @type {{ can: (p: string) => boolean }} */
	const { can } = getContext('permission')

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
		if (deployment.action === 'pause') return 'Paused'
		if (deployment.action === 'delete') return 'Deleting'
		if (deployment.status === 'pending') return 'Pending'
		if (deployment.status === 'error') return 'Error'
		if (deployment.status === 'cancelled') return 'Cancelled'
		return 'Success'
	})

	// The DeploymentStatusIcon next to the name already carries the visual
	// signal for a healthy running deployment. Only surface the status pill
	// in the meta row when it tells you something the icon can't (paused,
	// deleting, pending, error). Keeps the common running case clean.
	const showStatusPill = $derived(
		deployment.action !== 'deploy' || deployment.status !== 'success'
	)

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

	/* Action pill — sans, matches project's button family in spirit but with
	   a slightly tighter footprint for the masthead. */
	.mast-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background: transparent;
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		border-radius: 6px;
		padding: 0 0.85rem;
		height: 2rem;
		color: hsl(var(--hsl-content));
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}
	.mast-btn:hover:not(:disabled) {
		background: hsl(var(--hsl-content) / 0.05);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-content) / 0.2);
	}
	.mast-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.mast-btn.is-primary {
		background: hsl(var(--hsl-primary));
		border-color: hsl(var(--hsl-primary));
		color: hsl(var(--hsl-primary-content));
	}
	.mast-btn.is-primary:hover:not(:disabled) {
		background: hsl(var(--hsl-primary) / 0.92);
		border-color: hsl(var(--hsl-primary) / 0.92);
	}

	/* Meta strip — sans, normal case. Labels are dim, values pop. Mono is
	   reserved for the location id which is a machine identifier. */
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
		gap: 0.35rem;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		min-width: 0;
	}

	.meta__label {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.meta__value {
		color: hsl(var(--hsl-content));
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta__value.is-mono {
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		font-family: var(--ffml-primary);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-pill[data-tone='warn'] {
		background: hsl(var(--hsl-warning) / 0.12);
		color: hsl(var(--hsl-warning));
	}

	.status-pill[data-tone='negative'] {
		background: hsl(var(--hsl-negative) / 0.12);
		color: hsl(var(--hsl-negative));
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
				<span class="inline-flex" title={can('deployment.deploy') ? null : denyTooltip('deployment.deploy')}>
					<button class="mast-btn" type="button" disabled={!can('deployment.deploy')} aria-disabled={!can('deployment.deploy')} onclick={pause}>
						<i class="fa-solid fa-pause"></i> Pause
					</button>
				</span>
			{/if}
			{#if canResume}
				<span class="inline-flex" title={can('deployment.deploy') ? null : denyTooltip('deployment.deploy')}>
					<button class="mast-btn" type="button" disabled={!can('deployment.deploy')} aria-disabled={!can('deployment.deploy')} onclick={resume}>
						<i class="fa-solid fa-play"></i> Resume
					</button>
				</span>
			{/if}
			{#if can('deployment.deploy')}
				<a class="mast-btn is-primary"
					href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
					<i class="fa-solid fa-rocket"></i> Deploy New Revision
				</a>
			{:else}
				<span class="inline-flex" title={denyTooltip('deployment.deploy')}>
					<button class="mast-btn is-primary" type="button" disabled aria-disabled="true">
						<i class="fa-solid fa-rocket"></i> Deploy New Revision
					</button>
				</span>
			{/if}
		</div>
	</div>

	<div class="masthead__meta">
		{#if showStatusPill}
			<span class="status-pill" data-tone={statusTone}>
				<span class="meta__dot" data-tone={statusTone}></span>
				{statusLabel}
			</span>
			<span class="meta__divider"></span>
		{/if}
		<span class="meta">
			<span class="meta__label">Type</span>
			<span class="meta__value">
				{format.deploymentType(deployment.type)}{deployment.internal ? ' · Internal' : ''}
			</span>
		</span>
		<span class="meta__divider"></span>
		<span class="meta">
			<span class="meta__label">Location</span>
			<span class="meta__value is-mono">{deployment.location}</span>
		</span>
		<span class="meta__divider"></span>
		<span class="meta">
			<span class="meta__label">Revision</span>
			<span class="meta__value">#{deployment.revision}</span>
		</span>
	</div>
</div>
