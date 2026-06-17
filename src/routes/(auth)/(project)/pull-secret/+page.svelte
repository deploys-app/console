<script lang="ts">
	import type { PageData } from './$types'
	import ListTable from '$lib/components/ListTable.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import * as format from '$lib/format'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const pullSecrets = $derived(data.pullSecrets)
	const error = $derived(data.error)
</script>

<ListTable
	title="Pull Secrets"
	items={pullSecrets}
	{error}
	noun="pull secret"
	createPermission="pullsecret.create"
	createHref="/pull-secret/create?project={project}"
	columns={['Name', 'Location', 'Created at']}
	key={(it) => `${it.name}-${it.location}`}>
	{#snippet row(it)}
		<td>
			<StatusIcon status={it.status} />
			<a class="link cell-name" href="/pull-secret/detail?project={project}&location={it.location}&name={it.name}">
				{it.name}
			</a>
		</td>
		<td>
			<span class="loc-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}</span>
		</td>
		<td>
			<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
		</td>
	{/snippet}
</ListTable>
