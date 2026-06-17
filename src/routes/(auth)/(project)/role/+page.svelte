<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import * as format from '$lib/format'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const roles = $derived(data.roles)
	const error = $derived(data.error)

	function roleCanUpdate (sid: string) {
		return sid !== 'owner'
	}
</script>

<ListTable
	title="Roles"
	items={roles}
	{error}
	noun="role"
	createPermission="role.create"
	createHref="/role/create?project={project}"
	columns={['Role', 'Name', 'Created At']}
	actions
	key={(it) => it.role}>
	{#snippet row(it)}
		<td>
			<a href="/role/detail?project={project}&role={it.role}" class="link cell-name">
				{it.role}
			</a>
		</td>
		<td><span class="cell-muted">{it.name}</span></td>
		<td>
			<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
		</td>
		<td>
			{#if roleCanUpdate(it.role)}
				<GuardedButton permission="role.create" class="contents" href="/role/create?project={project}&role={it.role}" aria-label="Edit">
					<div class="icon-button">
						<i class="fa-solid fa-pen"></i>
					</div>
				</GuardedButton>
			{:else}
				<!-- Reserve the icon-button's footprint so rows without an
				     edit action keep the same height as the others. -->
				<div class="w-8 h-8" aria-hidden="true"></div>
			{/if}
		</td>
	{/snippet}
</ListTable>
