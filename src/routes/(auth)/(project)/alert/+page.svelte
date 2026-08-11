<script lang="ts">
	import { onMount } from 'svelte'
	import { invalidateAll } from '$app/navigation'
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import { alertConditionString, alertTargetString, alertValueString } from '$lib/alert'
	import { denyTooltip, getPermissionContext } from '$lib/permission'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const alerts = $derived(data.alerts)
	const error = $derived(data.error)

	// Rules can flip firing/resolve at any minute (the alert-tick cron runs every
	// minute), so keep the list fresh the same way the deployment metrics page
	// does: a self-rescheduling timeout that reinvokes the page load, not a plain
	// interval — this way a slow reload never overlaps the next tick.
	const RELOAD_INTERVAL_MS = 60_000
	let reloadTimeout: ReturnType<typeof setTimeout> | null = null

	function scheduleReload () {
		reloadTimeout && clearTimeout(reloadTimeout)
		reloadTimeout = setTimeout(async () => {
			await invalidateAll()
			scheduleReload()
		}, RELOAD_INTERVAL_MS)
	}

	onMount(() => {
		scheduleReload()
		return () => { reloadTimeout && clearTimeout(reloadTimeout) }
	})
</script>

<ListTable
	title="Alerts"
	items={alerts}
	{error}
	noun="alert rule"
	createPermission="alert.create"
	createHref="/alert/create?project={project}"
	createLabel="Create rule"
	columns={['Name', 'Target', 'Condition', 'Status', 'Last value']}
	actions
	key={(it) => it.name}>
	{#snippet row(it)}
		<td>
			<a class="link cell-name" href="/alert/detail?project={project}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="font-mono text-sm text-content/70">{alertTargetString(it.target)}</span></td>
		<td><span class="font-mono text-sm">{alertConditionString(it.condition)}</span></td>
		<td>
			{#if it.disabled}
				<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="status-badge" data-status={it.status}>{it.status}</span>
			{/if}
		</td>
		<td class="tabular-nums">{alertValueString(it.condition.metric, it.lastValue)}</td>
		<td>
			<span class="inline-flex" title={can('alert.update') ? null : denyTooltip('alert.update')}>
				<a
					href={can('alert.update') ? `/alert/create?project=${project}&name=${it.name}` : null}
					aria-label="Edit"
					aria-disabled={can('alert.update') ? null : 'true'}>
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

	.status-badge[data-status='firing'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.status-badge[data-status='nodata'] {
		color: hsl(var(--hsl-content) / 0.55);
		background-color: hsl(var(--hsl-content) / 0.08);
	}
</style>
