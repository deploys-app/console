<script lang="ts">
	import ListTable from '$lib/components/ListTable.svelte'
	import * as format from '$lib/format'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const serviceAccounts = $derived(data.serviceAccounts)
	const error = $derived(data.error)
</script>

<ListTable
	title="Service Accounts"
	items={serviceAccounts}
	{error}
	noun="service account"
	createPermission="serviceaccount.create"
	createHref="/service-account/create?project={project}"
	columns={['Email', 'Name', 'Created At']}
	actions
	key={(it) => it.email}>
	{#snippet row(it)}
		<td>
			<a class="link cell-name" href="/service-account/detail?project={project}&id={it.sid}">
				{it.email}
			</a>
		</td>
		<td><span class="cell-muted">{it.name}</span></td>
		<td>
			<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
		</td>
		<td>
			<GuardedButton permission="serviceaccount.create" class="" href="/service-account/create?project={project}&id={it.sid}" aria-label="Edit">
				<div class="icon-button">
					<i class="fa-solid fa-pen"></i>
				</div>
			</GuardedButton>
		</td>
	{/snippet}
</ListTable>
