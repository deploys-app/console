<script lang="ts">
	import { browser } from '$app/environment'
	import { onDestroy } from 'svelte'
	import { podErrorReason, podErrorDetail, dominantReason } from '$lib/deployment/podError'
	import { podPrefixStripper } from '$lib/deployment/podName'

	interface Props {
		// Pre-signed log-service /errors URL (Api.Deployment.errorsUrl).
		url: string
		status: Api.DeploymentStatus
		action: Api.DeploymentAction
		type: Api.DeploymentType
		internalAddress?: string
		// compact = one-line masthead strip; otherwise the full Events-tab card.
		compact?: boolean
	}

	const { url, status, action, type, internalAddress, compact = false }: Props = $props()

	// Only deployments that are supposed to keep standing pods can meaningfully
	// have "no running pod": Static is edge-served (no pods, no errorsUrl) and a
	// paused deployment is intentionally at zero — neither should poll. Mirrors
	// DeploymentStatusIcon's needsPodStatus gate.
	const needsErrors = $derived(
		browser && !!url && type !== 'Static' && action !== 'pause' &&
		(status === 'success' || status === 'error' || status === 'pending')
	)

	let pods = $state<Api.PodError[]>([])
	const stripPods = $derived(podPrefixStripper({ internalAddress }))

	const totalRestarts = $derived(pods.reduce((n, p) => n + (p.restartCount || 0), 0))
	const reason = $derived(dominantReason(pods))

	let timer: ReturnType<typeof setTimeout> | null = null
	let destroyed = false

	function clearTimer () {
		if (timer) {
			clearTimeout(timer)
			timer = null
		}
	}

	async function poll () {
		clearTimer()
		if (destroyed) return

		try {
			const res = await fetch(url)
			if (res.status === 403) {
				// token expired — stop polling
				return
			}
			pods = (await res.json()) ?? []
		} catch (err) {
			console.error(err)
		} finally {
			if (!destroyed && needsErrors) {
				// jitter so many rows don't refetch in lockstep
				timer = setTimeout(poll, 10000 + Math.random() * 3000)
			}
		}
	}

	// Drop stale pods if the deployment we point at changes.
	$effect(() => {
		url
		pods = []
	})

	// Run the poll loop only while it's needed; restart on target change.
	$effect(() => {
		const active = needsErrors
		url
		clearTimer()
		if (active) {
			poll()
		}
		return clearTimer
	})

	onDestroy(() => {
		destroyed = true
		clearTimer()
	})
</script>

<style>
	/* compact: a single line under the masthead meta */
	.strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
		background: hsl(var(--hsl-negative) / 0.08);
		border: 1px solid hsl(var(--hsl-negative) / 0.2);
		color: hsl(var(--hsl-negative));
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
	}

	.strip__reason {
		font-weight: 700;
	}

	.strip__meta {
		color: hsl(var(--hsl-content) / 0.7);
	}

	.strip__sep {
		color: hsl(var(--hsl-content) / 0.3);
	}

	/* full card: Pod Health, sits atop the Events tab */
	.card {
		display: flex;
		flex-direction: column;
		background: hsl(var(--hsl-base-100));
		border: 1px solid hsl(var(--hsl-negative) / 0.25);
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 1.25rem;
	}

	.card__head {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 1rem;
		background: hsl(var(--hsl-negative) / 0.08);
		border-bottom: 1px solid hsl(var(--hsl-negative) / 0.18);
		color: hsl(var(--hsl-negative));
		font-family: var(--ffml-primary);
	}

	.card__title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.card__sub {
		color: hsl(var(--hsl-content) / 0.6);
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.card__list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
	}

	.row {
		display: grid;
		grid-template-columns:
			[pod]    minmax(7rem, 14rem)
			[reason] 11rem
			[detail] auto
			[msg]    1fr;
		align-items: baseline;
		column-gap: 0.75rem;
		padding: 0.3rem 1rem;
		line-height: 1.5;
	}

	.row:hover {
		background: hsl(var(--hsl-content) / 0.04);
	}

	.row__pod {
		grid-column: pod;
		color: hsl(var(--hsl-content) / 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row__reason {
		grid-column: reason;
		font-family: var(--ffml-primary);
		font-weight: 600;
		color: hsl(var(--hsl-negative));
		white-space: nowrap;
	}

	.row__detail {
		grid-column: detail;
		color: hsl(var(--hsl-content) / 0.6);
		white-space: nowrap;
	}

	.row__msg {
		grid-column: msg;
		color: hsl(var(--hsl-content) / 0.85);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.row {
			grid-template-columns: 1fr;
			row-gap: 0.1rem;
		}
		.row__msg { white-space: normal; }
	}
</style>

{#if pods.length > 0}
	{#if compact}
		<div class="strip" role="status">
			<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
			<span class="strip__reason">{reason}</span>
			<span class="strip__sep">·</span>
			<span class="strip__meta">{pods.length} pod{pods.length === 1 ? '' : 's'} not ready</span>
			{#if totalRestarts > 0}
				<span class="strip__sep">·</span>
				<span class="strip__meta">{totalRestarts} restart{totalRestarts === 1 ? '' : 's'}</span>
			{/if}
		</div>
	{:else}
		<section class="card">
			<header class="card__head">
				<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
				<h6 class="card__title">Pod Health</h6>
				<span class="card__sub">{pods.length} pod{pods.length === 1 ? '' : 's'} not ready</span>
			</header>
			<ul class="card__list">
				{#each pods as p (p.name)}
					<li class="row">
						<span class="row__pod" title={p.name}>{stripPods(p.name)}</span>
						<span class="row__reason">{podErrorReason(p)}</span>
						<span class="row__detail">{podErrorDetail(p)}</span>
						<span class="row__msg" title={p.message}>{stripPods(p.message)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
