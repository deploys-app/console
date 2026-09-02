<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'
	import { metricSourceStatus } from '$lib/metricsource'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const metricSources = $derived(data.metricSources)
	const error = $derived(data.error)
</script>

<ListTable
	title="Metric sources"
	items={metricSources}
	{error}
	noun="metric source"
	createPermission="metricSource.set"
	createHref="/metrics-sources/create?project={project}"
	createLabel="Create source"
	columns={['Name', 'Location / Deployment', 'Port', 'Path', 'Status']}
	actions
	key={(it) => it.name}>
	{#snippet row(it)}
		{@const status = metricSourceStatus(it)}
		<td>
			<a class="link cell-name" href="/metrics-sources/detail?project={project}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="font-mono text-sm text-content/70">{it.location} / {it.deployment}</span></td>
		<td class="tabular-nums">{it.port}</td>
		<td><span class="font-mono text-sm">{it.path}</span></td>
		<td>
			{#if status === 'disabled'}
				<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="status-badge" data-status={status}>{status}</span>
			{/if}
		</td>
		<td>
			<span class="inline-flex" title={can('metricSource.set') ? null : denyTooltip('metricSource.set')}>
				<a
					href={can('metricSource.set') ? `/metrics-sources/create?project=${project}&name=${it.name}` : null}
					aria-label="Edit"
					aria-disabled={can('metricSource.set') ? null : 'true'}>
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</a>
			</span>
		</td>
	{/snippet}
</ListTable>

<style>
	.status-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.status-badge[data-status='ok'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.status-badge[data-status='error'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.status-badge[data-status='truncated'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.14);
	}
</style>
