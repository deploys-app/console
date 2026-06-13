<script>
	import { getContext } from 'svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import { denyTooltip } from '$lib/permission'

	const { data } = $props()

	const project = $derived(data.project)
	const disks = $derived(data.disks)
	const error = $derived(data.error)

	/** @type {{ can: (p: string) => boolean }} */
	const { can } = getContext('permission')
</script>

<div class="page-head">
	<div>
		<h4><strong>Disks</strong></h4>
		<p class="page-sub">{disks.length} {disks.length === 1 ? 'disk' : 'disks'}</p>
	</div>
	<GuardedButton permission="disk.create" class="button is-icon-left" href="/disk/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Disk name</th>
				<th>Size</th>
				<th>Location</th>
				<th>Created at</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each disks as it (`${it.name}-${it.location}`)}
					<tr>
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
					</tr>
				{/each}
				<NoDataRow span={5} list={disks} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	/* Denied-state for the Edit link: no navigation, dimmed, non-interactive. */
	.edit-link[aria-disabled='true'] {
		cursor: not-allowed;
		opacity: 0.45;
		pointer-events: none;
	}
</style>
