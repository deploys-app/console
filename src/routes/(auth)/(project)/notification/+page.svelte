<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const channels = $derived(data.channels)
	const error = $derived(data.error)
</script>

<ListTable
	title="Notifications"
	items={channels}
	{error}
	noun="notification channel"
	createPermission="notification.create"
	createHref="/notification/create?project={project}"
	createLabel="Create channel"
	columns={['Name', 'Type', 'Target', 'Status']}
	actions
	key={(it) => it.name}>
	{#snippet row(it)}
		<td>
			<a class="link cell-name" href="/notification/detail?project={project}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="type-badge" data-type={it.config.type}>{it.config.type}</span></td>
		<td><span class="font-mono text-sm text-content/70 wrap-anywhere">{it.config.url}</span></td>
		<td>
			{#if it.disabled}
				<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="inline-flex items-center gap-2 text-positive/80"><i class="fa-solid fa-circle text-[0.5rem]"></i> Enabled</span>
			{/if}
		</td>
		<td>
			<span class="inline-flex" title={can('notification.update') ? null : denyTooltip('notification.update')}>
				<a
					href={can('notification.update') ? `/notification/detail?project=${project}&name=${it.name}` : null}
					aria-label="Edit"
					aria-disabled={can('notification.update') ? null : 'true'}>
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</a>
			</span>
		</td>
	{/snippet}
</ListTable>

<style>
	.type-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.type-badge[data-type='webhook'] {
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.type-badge[data-type='discord'] {
		color: hsl(var(--hsl-accent, var(--hsl-primary)));
		background-color: hsl(var(--hsl-accent, var(--hsl-primary)) / 0.12);
	}
</style>
