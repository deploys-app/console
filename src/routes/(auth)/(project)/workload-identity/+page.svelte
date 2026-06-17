<script lang="ts">
	import type { PageData } from './$types'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import ListTable from '$lib/components/ListTable.svelte'
	import * as format from '$lib/format'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const workloadIdentities = $derived(data.workloadIdentities)
	const error = $derived(data.error)
</script>

<ListTable
	title="Workload Identities"
	items={workloadIdentities}
	{error}
	noun="workload identity"
	nounPlural="workload identities"
	createPermission="workloadidentity.create"
	createHref="/workload-identity/create?project={project}"
	columns={['Name', 'Location', 'Created at']}
	key={(it) => `${it.location}-${it.name}`}>
	{#snippet row(it)}
		<td>
			<StatusIcon status={it.status} />
			<a class="link cell-name" href="/workload-identity/detail?project={project}&location={it.location}&name={it.name}">
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
