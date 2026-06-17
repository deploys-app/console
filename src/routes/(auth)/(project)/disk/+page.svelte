<script lang="ts">
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import ListTable from '$lib/components/ListTable.svelte'
	import * as format from '$lib/format'
	import { denyTooltip, getPermissionContext } from '$lib/permission'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const disks = $derived(data.disks)
	const error = $derived(data.error)

	const { can } = getPermissionContext()
</script>

<ListTable
	title="Disks"
	items={disks}
	{error}
	noun="disk"
	createPermission="disk.create"
	createHref="/disk/create?project={project}"
	columns={['Disk name', 'Size', 'Location', 'Created at']}
	actions
	key={(it) => `${it.name}-${it.location}`}>
	{#snippet row(it)}
		<td>
			<StatusIcon status={it.status} />
			<a class="link cell-name" href="/disk/metrics?project={project}&location={it.location}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="count-pill"><i class="fa-solid fa-hard-drive" aria-hidden="true"></i>{it.size} GiB</span></td>
		<td>
			<span class="loc-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}</span>
		</td>
		<td>
			<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
		</td>
		<td>
			<span class="inline-flex" title={can('disk.update') ? null : denyTooltip('disk.update')}>
				<a
					class="edit-link"
					href={can('disk.update') ? `/disk/create?project=${project}&location=${it.location}&name=${it.name}` : undefined}
					aria-label="Edit"
					aria-disabled={can('disk.update') ? undefined : 'true'}>
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</a>
			</span>
		</td>
	{/snippet}
</ListTable>

<style>
	/* Denied-state for the Edit link: no navigation, dimmed, non-interactive. */
	.edit-link[aria-disabled='true'] {
		cursor: not-allowed;
		opacity: 0.45;
		pointer-events: none;
	}
</style>
