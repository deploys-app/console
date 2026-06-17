<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import * as format from '$lib/format'
	import { denyTooltip, getPermissionContext } from '$lib/permission'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const jobs = $derived(data.jobs)
	const error = $derived(data.error)

	// Map a job's denormalized last result to a StatusIcon status. A paused job
	// shows a neutral marker; a never-run job shows nothing yet.
	function statusOf (job: Api.SchedulerJob): string {
		if (job.lastResult === 'success') return 'success'
		if (job.lastResult === 'failed') return 'error'
		return ''
	}
</script>

<ListTable
	title="Scheduler"
	items={jobs}
	{error}
	noun="job"
	createPermission="scheduler.create"
	createHref="/scheduler/create?project={project}"
	createLabel="Create job"
	columns={['Name', 'Schedule', 'Method', 'Last run', 'Status']}
	actions
	key={(it) => it.name}>
	{#snippet row(it)}
		<td>
			<a class="link cell-name" href="/scheduler/detail?project={project}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="font-mono text-sm">{it.schedule}</span></td>
		<td><span class="method-badge" data-method={it.method}>{it.method}</span></td>
		<td>
			{#if it.lastRunAt}
				<span class="cell-time" title={format.datetime(it.lastRunAt)}>{format.fromNow(it.lastRunAt)}</span>
			{:else}
				<span class="text-content/40">Never</span>
			{/if}
		</td>
		<td>
			{#if it.paused}
				<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-pause"></i> Paused</span>
			{:else if it.lastResult === 'success'}
				<span class="inline-flex items-center text-positive/80"><StatusIcon status={statusOf(it)} />Success</span>
			{:else if it.lastResult === 'failed'}
				<span class="inline-flex items-center text-negative/80"><StatusIcon status={statusOf(it)} />Failed</span>
			{:else}
				<span class="text-content/40">—</span>
			{/if}
		</td>
		<td>
			<span class="inline-flex" title={can('scheduler.update') ? null : denyTooltip('scheduler.update')}>
				<a
					href={can('scheduler.update') ? `/scheduler/create?project=${project}&name=${it.name}` : null}
					aria-label="Edit"
					aria-disabled={can('scheduler.update') ? null : 'true'}>
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</a>
			</span>
		</td>
	{/snippet}
</ListTable>

<style>
	.method-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--ffml-mono, monospace);
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.method-badge[data-method='GET'],
	.method-badge[data-method='HEAD'] {
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.method-badge[data-method='POST'],
	.method-badge[data-method='PUT'],
	.method-badge[data-method='PATCH'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.12);
	}

	.method-badge[data-method='DELETE'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}
</style>
