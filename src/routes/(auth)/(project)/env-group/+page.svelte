<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import * as format from '$lib/format'
	import { denyTooltip, getPermissionContext } from '$lib/permission'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const envGroups = $derived(data.envGroups)
	const error = $derived(data.error)
</script>

<ListTable
	title="Env Groups"
	items={envGroups}
	{error}
	noun="env group"
	createPermission="envgroup.create"
	createHref="/env-group/create?project={project}"
	columns={['Name', 'Variables', 'Created at']}
	actions
	key={(it) => it.name}>
	{#snippet row(it)}
		<td>
			<a class="link cell-name" href="/env-group/detail?project={project}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td><span class="count-pill"><i class="fa-solid fa-list" aria-hidden="true"></i>{Object.keys(it.env ?? {}).length}</span></td>
		<td>
			<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
		</td>
		<td>
			<span class="inline-flex" title={can('envgroup.update') ? null : denyTooltip('envgroup.update')}>
				<a
					href={can('envgroup.update') ? `/env-group/create?project=${project}&name=${it.name}` : null}
					aria-label="Edit"
					aria-disabled={can('envgroup.update') ? null : 'true'}>
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</a>
			</span>
		</td>
	{/snippet}
</ListTable>
