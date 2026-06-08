<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const deployments = $derived(data.deployments)
	const error = $derived(data.error)

	// Per-type glyph + label for the chip on each row's meta line.
	const typeMeta = {
		WebService: { icon: 'fa-globe', label: 'Web Service' },
		TCPService: { icon: 'fa-ethernet', label: 'TCP Service' },
		InternalTCPService: { icon: 'fa-network-wired', label: 'Internal TCP' },
		Worker: { icon: 'fa-gears', label: 'Worker' },
		CronJob: { icon: 'fa-clock', label: 'Cron Job' }
	}

	/**
	 * Static status label for the pill next to the name. A healthy running
	 * deployment returns null so its row stays clean — only noteworthy states
	 * (paused / deploying / failed / cancelled) get a labelled pill, mirroring
	 * the live icon to its left.
	 * @param {Api.Deployment} it
	 * @returns {{ label: string, tone: string } | null}
	 */
	function statusPill (it) {
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
	/* Meta line under the deployment name — the type chip plus an endpoint or
	   schedule, kept muted so the name stays the anchor of each row. */
	.dep-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.dep-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.dep-name .link {
		font-weight: 600;
	}

	.dep-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		font-size: 0.78rem;
	}

	.type-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.32rem;
		flex-shrink: 0;
		padding: 0.08rem 0.45rem;
		border-radius: 5px;
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.4;
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.7);
	}
	.type-chip i { font-size: 0.62rem; opacity: 0.7; }

	.endpoint {
		display: inline-block;
		max-width: 22rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: hsl(var(--hsl-content) / 0.5);
		font-family: var(--ffml-mono);
	}

	.schedule {
		color: hsl(var(--hsl-content) / 0.5);
		font-family: var(--ffml-mono);
		font-size: 0.74rem;
	}

	/* Status pill — colour-coded by tone, only rendered for non-running states. */
	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
		padding: 0.05rem 0.45rem;
		border-radius: 5px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	.status-pill.is-warning { background: hsl(var(--hsl-warning) / 0.14); color: hsl(var(--hsl-warning)); }
	.status-pill.is-info { background: hsl(var(--hsl-primary) / 0.12); color: hsl(var(--hsl-primary)); }
	.status-pill.is-negative { background: hsl(var(--hsl-negative) / 0.12); color: hsl(var(--hsl-negative)); }
	.status-pill.is-muted { background: hsl(var(--hsl-content) / 0.08); color: hsl(var(--hsl-content) / 0.6); }

	.ttl-flag { font-size: 0.72rem; }

	/* Compute cell — CPU · Memory, monospaced and dimmed for scanability. */
	.resources {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--ffml-mono);
		font-size: 0.8rem;
		color: hsl(var(--hsl-content) / 0.75);
	}
	.resources .sep { color: hsl(var(--hsl-content) / 0.3); }

	/* Replicas pill — fixed count, or a min–max range flagged as autoscaling. */
	.replicas {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.1rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.78rem;
		font-weight: 600;
		font-family: var(--ffml-mono);
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.8);
	}
	.replicas.is-auto { background: hsl(var(--hsl-primary) / 0.1); color: hsl(var(--hsl-primary)); }
	.replicas i { font-size: 0.62rem; opacity: 0.7; }
	.replicas-none { color: hsl(var(--hsl-content) / 0.35); }

	.location-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		color: hsl(var(--hsl-content) / 0.75);
	}
	.location-chip i { font-size: 0.7rem; opacity: 0.55; }

	.deployed {
		font-size: 0.82rem;
		color: hsl(var(--hsl-content) / 0.65);
	}
</style>

<div class="page-head">
	<div>
		<h4><strong>Deployments</strong></h4>
		<p class="page-sub">{deployments.length} {deployments.length === 1 ? 'deployment' : 'deployments'}</p>
	</div>
	<a class="button is-icon-left" href="/deployment/deploy?project={project}">
		<i class="fa-solid fa-plus"></i>
		Deploy
	</a>
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
								<div class="dep-cell">
									<div class="dep-name">
										<a class="link" href={`/deployment/metrics?project=${project}&location=${it.location}&name=${it.name}`}>
											{it.name}
										</a>
										{#if pill}
											<span class="status-pill is-{pill.tone}">{pill.label}</span>
										{/if}
										{#if it.ttl === -1}
											<i class="fa-regular fa-clock ttl-flag text-negative" title="Expired — pending deletion"></i>
										{:else if it.ttl > 0}
											<i class="fa-regular fa-clock ttl-flag text-warning"
												title={`Auto-delete at ${format.ttlExpireAt(it.ttl)} (in ${format.duration(it.ttl)})`}></i>
										{/if}
									</div>
									<div class="dep-meta">
										<span class="type-chip"><i class="fa-solid {type.icon}"></i>{type.label}</span>
										{#if it.type === 'CronJob' && it.schedule}
											<span class="schedule">{it.schedule}</span>
										{:else if it.url}
											<span class="endpoint" title={it.url}>{it.url}</span>
										{/if}
									</div>
								</div>
							</div>
						</td>
						<td>
							<span class="resources">
								{format.cpu(it.resources.requests.cpu)}
								<span class="sep">·</span>
								{format.memory(it.resources.requests.memory)}
							</span>
						</td>
						<td>
							{#if it.minReplicas > 0}
								<span class="replicas" class:is-auto={autoscale}>
									{#if autoscale}
										<i class="fa-solid fa-arrows-up-down"></i>{it.minReplicas}–{it.maxReplicas}
									{:else}
										{it.minReplicas}
									{/if}
								</span>
							{:else}
								<span class="replicas-none">—</span>
							{/if}
						</td>
						<td>
							<span class="location-chip">
								<i class="fa-solid fa-location-dot"></i>{it.location}
							</span>
						</td>
						<td>
							<span class="deployed" title={format.datetime(it.createdAt)}>
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
						ctaHref={`/deployment/deploy?project=${project}`} />
				{/if}
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
