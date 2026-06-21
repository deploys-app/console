<script lang="ts">
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import api from '$lib/api'
	import { onMount } from 'svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const deployments = $derived(data.deployments)
	const error = $derived(data.error)

	// A deploy/delete/pause that's still settling reports `status: 'pending'`, so
	// the list snapshot goes stale the moment one is in flight (e.g. a row stuck
	// on "Deleting" until a manual refresh). Poll while any row has pending work
	// so the table converges on its own; once everything's resolved we stop
	// re-fetching, with a 2-minute floor as a catch-all for slower drift.
	const hasPendingAction = $derived(
		deployments.some((it) => it.status === 'pending' || it.action === 'delete')
	)

	let lastReload = Date.now()

	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPendingAction && Date.now() - lastReload < 120000) {
			return
		}
		await api.invalidate('deployment.list')
		lastReload = Date.now()
	}, 4000))

	// Per-type glyph + label for the chip on each row's meta line.
	const typeMeta: Record<string, { icon: string, label: string }> = {
		WebService: { icon: 'fa-globe', label: 'Web Service' },
		TCPService: { icon: 'fa-ethernet', label: 'TCP Service' },
		InternalTCPService: { icon: 'fa-network-wired', label: 'Internal TCP' },
		Worker: { icon: 'fa-gears', label: 'Worker' },
		CronJob: { icon: 'fa-clock', label: 'Cron Job' }
	}

	/**
	 * Static status label for the pill next to the name. A healthy running
	 * deployment returns null so its row stays clean — only noteworthy states
	 * (deleting / paused / deploying / failed / cancelled) get a labelled pill,
	 * mirroring the live icon to its left.
	 *
	 * A pending delete reuses the same `status: 'pending'` as a fresh deploy, so
	 * the action has to be checked first — otherwise a deployment being torn down
	 * would mislabel as "Deploying".
	 */
	function statusPill (it: Api.Deployment): { label: string, tone: string } | null {
		if (it.action === 'delete') {
			return { label: 'Deleting', tone: 'negative' }
		}
		if (it.action === 'pause') {
			return { label: 'Paused', tone: 'warning' }
		}
		switch (it.status) {
		case 'pending': return { label: 'Deploying', tone: 'info' }
		case 'error': return { label: 'Failed', tone: 'negative' }
		case 'cancelled': return { label: 'Cancelled', tone: 'muted' }
		default: return null
		}
	}
</script>

<style>
	/* Resources cell — CPU · Memory, monospaced and dimmed for scanability. */
	.resources {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--ffml-mono);
		font-size: 0.8rem;
		color: hsl(var(--hsl-content) / 0.75);
	}
	.resources .sep { color: hsl(var(--hsl-content) / 0.3); }
	/* Static deployments have no configurable resources — show a muted placeholder. */
	.resources-none { color: hsl(var(--hsl-content) / 0.35); }

	/* CronJob schedule on the meta line. */
	.schedule {
		color: hsl(var(--hsl-content) / 0.5);
		font-family: var(--ffml-mono);
		font-size: 0.74rem;
	}

	.ttl-flag {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.replicas-none { color: hsl(var(--hsl-content) / 0.35); }
</style>

<div class="page-head">
	<div>
		<h4><strong>Deployments</strong></h4>
		<p class="page-sub">{deployments.length} {deployments.length === 1 ? 'deployment' : 'deployments'}</p>
	</div>
	<GuardedButton permission="deployment.deploy" class="button is-icon-left" href="/deployment/deploy?project={project}">
		<i class="fa-solid fa-plus"></i>
		Deploy
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Deployment</th>
				<th>Resources</th>
				<th>Replicas</th>
				<th>Location</th>
				<th>Last deployed</th>
			</tr>
			</thead>
			<tbody>
				{#each deployments as it (`${it.name}-${it.location}`)}
					{@const type = typeMeta[it.type] ?? { icon: 'fa-cube', label: it.type }}
					{@const pill = statusPill(it)}
					{@const autoscale = it.minReplicas > 0 && it.minReplicas !== it.maxReplicas}
					<tr>
						<td>
							<div style="display:flex; align-items:flex-start;">
								<div style="padding-top:0.15rem;">
									<DeploymentStatusIcon action={it.action} status={it.status} url={it.statusUrl} type={it.type} />
								</div>
								<div class="cell-stack">
									<div class="cell-line">
										<a class="link cell-name" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
											{it.name}
										</a>
										{#if pill}
											<span class="status-pill is-{pill.tone}">{pill.label}</span>
										{/if}
										{#if it.ttl === -1}
											<span class="ttl-flag text-negative" title="Expired — pending deletion">
												<i class="fa-regular fa-clock"></i> expired
											</span>
										{:else if it.ttl > 0}
											<span class="ttl-flag text-warning"
												title={`Auto-delete at ${format.ttlExpireAt(it.ttl)}`}>
												<i class="fa-regular fa-clock"></i> expires in {format.duration(it.ttl)}
											</span>
										{/if}
									</div>
									<div class="cell-meta">
										<span class="meta-chip"><i class="fa-solid {type.icon}" aria-hidden="true"></i>{type.label}</span>
										{#if it.type === 'CronJob' && it.schedule}
											<span class="schedule">{it.schedule}</span>
										{/if}
									</div>
								</div>
							</div>
						</td>
						<td>
							{#if it.type === 'Static'}
								<span class="resources-none" title="Static sites have no configurable resources">—</span>
							{:else}
								<span class="resources">
									{format.cpuLimited(it.resources.limits.cpu)}
									<span class="sep">·</span>
									{format.memory(it.resources.requests.memory)}
								</span>
							{/if}
						</td>
						<td>
							{#if it.minReplicas > 0}
								<span class="count-pill" class:is-accent={autoscale}>
									{#if autoscale}
										<i class="fa-solid fa-arrows-up-down" aria-hidden="true"></i>{it.minReplicas}–{it.maxReplicas}
									{:else}
										{it.minReplicas}
									{/if}
								</span>
							{:else}
								<span class="replicas-none">—</span>
							{/if}
						</td>
						<td>
							<span class="loc-chip">
								<i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}
							</span>
						</td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>
								{format.fromNow(it.createdAt) || '—'}
							</span>
						</td>
					</tr>
				{/each}
				{#if !error}
					<NoDataRow span={5} list={deployments}
						icon="fa-rocket"
						message="No deployments yet"
						hint="Deploy a container image to get started."
						ctaLabel="Deploy"
						ctaHref={`/deployment/deploy?project=${project}`}
						{error} />
				{/if}
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
