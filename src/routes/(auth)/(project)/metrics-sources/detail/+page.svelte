<script lang="ts">
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import CustomMetricsChart from '$lib/components/CustomMetricsChart.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions, type PageAction } from '$lib/pageactions/store.svelte'
	import { metricSourceStatus } from '$lib/metricsource'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const source = $derived(data.source)
	const series = $derived(data.series)
	const status = $derived(metricSourceStatus(source))

	const { can } = getPermissionContext()
	$effect(() => {
		const actions: PageAction[] = []
		if (can('metricSource.set')) {
			actions.push({
				id: 'metric-source-detail:edit',
				label: 'Edit',
				icon: 'fa-pen',
				keywords: 'edit modify update metric source scrape',
				href: `/metrics-sources/create?project=${project}&name=${encodeURIComponent(source.name)}`
			})
		}
		if (!actions.length) return
		return registerPageActions(actions)
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${source.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('metricSource.delete', { project, name: source.name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/metrics-sources?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/metrics-sources?project=${project}`} class="link"><h6>Metric sources</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{source.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{source.name}</strong></h4>
		<p class="page-sub">
			{#if status === 'disabled'}
				<span class="text-content/60"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="status-badge" data-status={status}>{status}</span>
			{/if}
			<span class="text-content/50 font-mono text-sm ml-2">{source.location} / {source.deployment}:{source.port}{source.path}</span>
		</p>
	</div>
	<div class="flex gap-3 flex-wrap">
		<a class="button is-variant-secondary is-icon-left" href={`/alert/create?project=${project}`}>
			<i class="fa-solid fa-bell-exclamation"></i>
			Create alert
		</a>
		<GuardedButton permission="metricSource.set" class="button is-variant-secondary is-icon-left"
			href={`/metrics-sources/create?project=${project}&name=${encodeURIComponent(source.name)}`}>
			<i class="fa-solid fa-pen"></i>
			Edit
		</GuardedButton>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="field">
				<label for="d-last-scraped">Last scraped</label>
				<div class="input">
					<input id="d-last-scraped" value={source.lastScrapedAt ? format.fromNow(source.lastScrapedAt) : 'Never'} readonly disabled title={source.lastScrapedAt ? format.datetime(source.lastScrapedAt) : ''}>
				</div>
			</div>
			<div class="field">
				<label for="d-created">Created</label>
				<div class="input">
					<input id="d-created" value={format.datetime(source.createdAt)} readonly disabled>
				</div>
			</div>
			<div class="field">
				<label for="d-updated-by">Updated by</label>
				<div class="input">
					<input id="d-updated-by" value={source.updatedBy} readonly disabled>
				</div>
			</div>
		</div>

		<hr>

		<div>
			<h6><strong>Chart</strong></h6>
			<p class="text-content/50 text-sm mt-1">Scraped series for this source. Leave the series filter empty to chart the most recently seen.</p>
		</div>

		<CustomMetricsChart {project} {source} seriesItems={series} />

		<hr>

		<div>
			<h6><strong>Discovered series</strong></h6>
			<p class="text-content/50 text-sm mt-1">Gauges, counters, and untyped metrics kept from the last scrape. Histograms and summaries are dropped.</p>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Series</th>
						<th>Type</th>
						<th>Last seen</th>
					</tr>
				</thead>
				<tbody>
					{#each series as s (s.series)}
						<tr>
							<td><span class="font-mono text-sm">{s.series}</span></td>
							<td><span class="type-badge" data-type={s.type}>{s.type}</span></td>
							<td>
								<span class="cell-time" title={format.datetime(s.lastSeenAt)}>{format.fromNow(s.lastSeenAt) || '—'}</span>
							</td>
						</tr>
					{:else}
						<tr><td colspan="3" class="text-center text-content/50">No series discovered yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<DangerZone description="Permanently delete this metric source and its stored series.">
			<GuardedButton permission="metricSource.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>

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

	.type-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--ffml-mono, monospace);
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.type-badge[data-type='gauge'] {
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.type-badge[data-type='counter'] {
		color: hsl(var(--hsl-accent));
		background-color: hsl(var(--hsl-accent) / 0.12);
	}
</style>
